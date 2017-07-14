import log4js = require('log4js');
import { Entry } from "./Entry";

export class Account {
    private name: string;
    private credit: number;
    private transactions: Entry[];
    private logger = log4js.getLogger();

    constructor (name: string,entry?: Entry) {
        //this.logger.trace("Creating new account");
        this.name = name;
        this.credit = 0;
        if (entry) {
            this.transactions = [entry];
            const error = this.processTransactions();
            if (error) {
                console.log("There were one or more errors creating this account, check logs/debug.log for details");
            }
        } else {
            this.transactions = [];
        }
        this.logger.debug("Account "+this.name+" created");
    }

    public getName(): string {
        return this.name;
    }
    public getCredit(): number {
        return this.credit;
    }

    private processTransactions(): boolean {
        let error: boolean = false;
        //this.logger.trace("Processing all transactions for account \""+this.name+"\"");
        let credit: number = 0;
        for (let i = 0; i<this.transactions.length; i++) {
            this.logger.debug("Processing transaction from line "+this.transactions[i].getLine().toString());
            if (this.transactions[i].getFrom() === this.name) {
                //this.logger.debug("Account holder is paying");
                if ((isNaN(this.transactions[i].getAmount())) || (typeof this.transactions[i].getAmount() != "number")) {
                    this.logger.error("Transaction amount on line "+this.transactions[i].getLine().toString()+" is NaN! Transaction will not be processed");
                    error = true;
                } else {
                    credit -= this.transactions[i].getAmount();
                }
            }
            if (this.transactions[i].getTo() === this.name) {
                //this.logger.debug("Account holder is being paid");
                if ((isNaN(this.transactions[i].getAmount())) || (typeof this.transactions[i].getAmount() != "number")) {
                    this.logger.error("Transaction amount on line "+this.transactions[i].getLine().toString()+" is NaN! Transaction will not be processed");
                    error = true;
                } else {
                    credit += this.transactions[i].getAmount();
                }
            }
        }
        this.credit = credit;
        return error;
    }
    private processNewTransaction(): boolean {   //assumes only one transaction has been added since credit was last generated
        let error: boolean = false;
        this.logger.trace("Processing last transaction for account \""+this.name+"\" from line "+this.transactions[this.transactions.length-1].getLine().toString());
        if (this.transactions[this.transactions.length-1].getFrom() === this.name) {
            //this.logger.debug("Account holder is paying");
            if ((isNaN(this.transactions[this.transactions.length-1].getAmount())) || (typeof this.transactions[this.transactions.length-1].getAmount() != "number")) {
                this.logger.error("Transaction amount on line "+this.transactions[this.transactions.length-1].getLine().toString()+" is NaN! Transaction will not be processed");
                error = true;
            } else {
                this.credit -= this.transactions[this.transactions.length-1].getAmount();
            }
        }
        if (this.transactions[this.transactions.length-1].getTo() === this.name) {
            //this.logger.debug("Account holder is being paid");
            if ((isNaN(this.transactions[this.transactions.length-1].getAmount())) || (typeof this.transactions[this.transactions.length-1].getAmount() != "number")) {
                this.logger.error("Transaction amount on line "+this.transactions[this.transactions.length-1].getLine().toString()+" is NaN! Transaction will not be processed");
                error = true;
            } else {
                this.credit += this.transactions[this.transactions.length-1].getAmount();
            }
        }
        return error;
    }

    public addEntry(entry: Entry): void {
        this.logger.trace("New transaction added to account \""+this.name+"\"");
        this.transactions[this.transactions.length] = entry;
        this.processNewTransaction();
    }
    public print(): void {
        if (this.credit < 0) {
            console.log(this.name+": -£"+(this.credit*-1).toFixed(2).toString());
        } else {
            console.log(this.name+": £"+this.credit.toFixed(2).toString());
        }
    }
    public printAll(): void {
        for (let i = 0; i<this.transactions.length; i++) {
            this.transactions[i].print();
        }
    }
}