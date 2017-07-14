import fs = require('fs');
import readline = require('readline');
import log4js = require('log4js');
import xml2js = require('xml2js');
import util = require('util');
import { Entry } from "./Entry";
import { Account } from "./Account";
import { AppenderConfig} from 'log4js'

export class Template {

    public logger = log4js.getLogger();

    public run(): void {
        
        log4js.configure({
            appenders: [
                { type: 'console' },
                { type: 'file', filename: 'logs/debug.log' }
            ]
        });

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        let entries: Entry[] = [];
        let accounts: Account[] = [];
        let fileProcessed: boolean = false;

        rl.on('line', (input: string) => {
            this.logger.trace("Received command \""+input+"\"");
            if (input.startsWith("List ")) {
                if (fileProcessed) {
                    this.listAccounts(accounts,input.slice(5));
                } else {
                    console.log("No file has been processed yet");
                    this.logger.warn("Cannot list accounts as no file has been processed");
                }
            } else if (input.startsWith("Import File ")) {
                if (!fileProcessed) {
                    const entryPromise = this.readFile(input.slice(12));
                    entryPromise.then((successMessage) => {
                        entries = successMessage;
                        const accountPromise = this.processEntries(entries);
                        accountPromise.then((successMessage) => {
                            accounts = successMessage;
                            fileProcessed = true;
                        });
                    });
                } else {
                    console.log("A file has already been processed");
                    this.logger.warn("A file has already been opened");
                }             
            } else {
                console.log("That is not a valid command");
                this.logger.warn("Invalid command given");
            }               
        });
        
    }

    public readFile(fileName: string): Promise<Entry[]> {
        this.logger.trace("Opening file "+fileName);
        return new Promise((resolve, reject) => {
            fs.readFile(fileName,"utf8",(err, data) => {
                if (err) {
                    this.logger.error("Problem opening file "+fileName);
                    this.logger.error(err.message);
                    reject("Error opening file");
                } else {
                    this.logger.debug("File Opened");
                    if (fileName.endsWith(".csv")) {
                        const split: RegExp = /[,\n]/;
                        const transactions: string[] = data.split(split);
                        const entries: Entry[] = this.createEntriesCSV(transactions);
                        resolve(entries);
                    } else if (fileName.endsWith(".json")) {
                        const transactions: Object[] = JSON.parse(data);
                        const entries: Entry[] = this.createEntriesJSON(transactions);
                        resolve(entries);
                    } else if (fileName.endsWith(".xml")) {
                        xml2js.parseString(data, (err, result) => {
                            if (err) {
                                this.logger.error("Issue parsing file "+fileName+" using xml2js");
                                this.logger.error(err.message);
                                reject("Error opening file");
                            } else {
                                const entries: Entry[] = this.createEntriesXML(result);
                                resolve(entries);
                            }
                        });
                    } else {
                        console.log("File format not supported, use csv, json, or xml");
                        this.logger.warn("File "+fileName+" is not in a format that can be opened");
                        reject("File format not supported");
                    }
                }                        
            });
        });
    }

    public createEntriesXML(transactions: Object[]): Entry[] {
        this.logger.trace("Creating entries from file");
        let error: boolean = false;
        let entries: Entry[] = [];
        const simpleTrans: Object[] = transactions["TransactionList"]["SupportTransaction"];
        if (simpleTrans === null) {
            console.log("There was an error processing the file");
            this.logger.error("The xml file was not formatted correctly");
            error = true;
            return null;
        }
        for (let i = 0; i<simpleTrans.length; i++) {
            const date = new Date((parseInt(simpleTrans[i]["$"]["Date"])-25568)*86400000); //given an int number of days with jan 1 1900 being 0
            //calculates days after jan 1 1970, converts to ms, uses standard date constructor
            entries[i] = new Entry(date,simpleTrans[i]["Parties"][0]["From"][0],simpleTrans[i]["Parties"][0]["To"][0],simpleTrans[i]["Description"][0],parseFloat(simpleTrans[i]["Value"][0]),i+1);
        }
        return entries;
    }

    public createEntriesJSON(transactions: Object[]): Entry[] {
        this.logger.trace("Creating entries from file");
        let error: boolean = false;
        let entries: Entry[] = [];
        for (let i = 0; i<transactions.length; i++) {
            const date = new Date(transactions[i]["Date"]);
            if (date.toDateString() === "Invalid Date") {
                error = true;
                this.logger.error("Entry on line "+(i+1).toString()+" doesnot have a correctly formatted date");
            }
            if (isNaN(transactions[i]["Amount"])) {
                error = true;
                this.logger.error("Entry on line "+(i+1).toString()+" does not have a number in the amount field");
            }
            entries[i] = new Entry(date,transactions[i]["FromAccount"],transactions[i]["ToAccount"],transactions[i]["Narrative"],transactions[i]["Amount"],i+1);
        }
        if (error) {
            console.log("There were one or more errors creating the entries, check logs/debug.log for details");
        } else {
            this.logger.debug("Entries created succesfully");
        }
        return entries;
    }

    public createEntriesCSV(transactions: string[]): Entry[] {
        this.logger.trace("Creating entries from file");
        let error: boolean = false;
        let entries: Entry[] = [];
        for (let i = 5; i<transactions.length-1; i = i+5) {
            const rawDate: string = transactions[i];
            const dateArr: string[] = rawDate.split("/");
            const date: Date = new Date(parseInt(dateArr[2]),parseInt(dateArr[1]),parseInt(dateArr[0]));
            if (date.toDateString() === "Invalid Date") {
                error = true;
                this.logger.error("Entry on line "+(i/5+1).toString()+" does not have a correctly formatted date");
            }
            const amount = parseFloat(transactions[i+4]);
            if (isNaN(amount)) {
                this.logger.error("Entry on line "+(i/5+1).toString()+" does not have a number in the amount field");
                error = true;
            }
            entries[i/5 - 1] = new Entry(date,transactions[i+1],transactions[i+2],transactions[i+3],amount,i/5+1);
        }
        if (error) {
            console.log("There were one or more errors creating the entries, check logs/debug.log for details");
        } else {
            this.logger.debug("Entries created succesfully");
        }
        return entries;
    }

    public processEntries(entries: Entry[]): Promise<Account[]> {
        return new Promise ((resolve, reject) => {
            let error: boolean = false;
            let accounts: Account[] = [];
            for (let i = 0; i<entries.length; i++) {
                let existsFrom: boolean = false;
                let existsTo: boolean = false;
                for (let j = 0; j<accounts.length; j++) {
                    if (accounts[j].getName() === entries[i].getFrom()) {
                        existsFrom = true;
                        accounts[j].addEntry(entries[i]);
                    }
                    if (accounts[j].getName() === entries[i].getTo()) {
                        existsTo = true;
                        accounts[j].addEntry(entries[i]);
                    }
                    if (existsFrom && existsTo) {
                        break;
                    }
                }
                if (!existsFrom) {
                    accounts[accounts.length] = new Account(entries[i].getFrom(),entries[i]);
                }
                if (!existsTo) {
                    accounts[accounts.length] = new Account(entries[i].getTo(),entries[i]);
                }
            }
            resolve(accounts);
        });
    }

    public listAccounts(accounts: Account[], command: string) {
        if (command === "All") {
            this.logger.trace("Printing all accounts");
            for (let i = 0; i<accounts.length; i++) {
                    accounts[i].print();
            }
        } else {
            let found: boolean = false;
            this.logger.debug("Looking for account name \""+command+"\"");
            for (let i = 0; i<accounts.length; i++) {
                if (accounts[i].getName() === command) {
                    this.logger.debug("Account found");
                    accounts[i].printAll();
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.log("No account with that name found");
                this.logger.warn("No matching account found");
            }
        }
    }
}

