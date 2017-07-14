import { Template } from './workspace/template'

export class Index {
    public static main(): number {
        const template = new Template();
        template.run();

        return 0;
    }
}

Index.main();