export class Entry {
    private date: Date;
    private from: string;
    private to: string;
    private narrative: string;
    private amount: number;
    private line: number;

    constructor (date: Date, from: string, to: string, narrative: string, amount: number, line: number) {
        this.date = date;
        this.from = from;
        this.to = to;
        this.narrative = narrative;
        this.amount = amount;
        this.line = line;
    }

    public getDate(): Date {
        return this.date;
    }
    public getFrom(): string {
        return this.from;
    }
    public getTo(): string {
        return this.to;
    }
    public getNarrative(): string {
        return this.narrative;
    }
    public getAmount(): number {
        return this.amount;
    }
    public getLine(): number {
        return this.line;
    }

    public print(): void {
        console.log(this.date.toDateString()+", from "+this.from+" to "+this.to+", "+this.narrative+", £"+this.amount.toString());
    }
}