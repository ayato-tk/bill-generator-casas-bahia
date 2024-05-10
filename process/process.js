

export class Process {

    file;
    db;

    /*
    TODO: Transfer this logic to enum;
        STATUS
            - 0 = Created
            - 1 = Processing
            - 2 = Done
            - 3 = Error
    */

    constructor(id, date, type, status = 0, db) {
        this.file = { id, date, type, status };
        this.db = db;
    }

    async createProcess(adapter) {
        this.db.push(this.file);
        const data = { ...this.file, status: 1 };
        await this.updateProcessFile(data, adapter);
        await adapter.write();
        return this.file;
    }

    async updateProcessFile(file, adapter) {
        const currentFile = this.db.find(process => process.id === file.id);
        currentFile.status = file.status;
        await adapter.write();
        return true
    }
    
    static getProcessById(id, db) {
        return db.find(process => process.id === id);
    }

    static getAllProcesses(page, perPage, db) {
        return db.slice(perPage * (page - 1), perPage * page);
    }
    
}