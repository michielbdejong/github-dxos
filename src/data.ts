const fsPromises = require("fs/promises");

export type OperationType = 'upsert' | 'merge' | 'fork';
export type ObjectType = 'issue' | 'worked' | 'comment';

export class Item {
  type: string;
  identifiers: string[];
  deleted: boolean;
}

export class Issue extends Item {
  title: string;
  body: string;
  completed: boolean;
};

export class Worked extends Item {
  userId: string;
  project: string;
  task: string;
  description: string;
  startTime: string;
  endTime: string;
  date: string;
};

export class Comment extends Item {
  issueId: string;
  body: string;
}

export type Operation = {
  operationType: OperationType,
  fields: Partial<Item>
};

export class DataStore {
  items: Item[] = [];
  match(identifiers: string[], cb: (i: number, id: string) => void) {
    for (let i = 0; i < this.items.length; i++) {
      for (let j = 0; j < identifiers.length; j++) {
        console.log('matching', this.items[i]);
        if (this.items[i].identifiers.includes(identifiers[j])) {
          cb(i, identifiers[j]);
        }
      }
    }
  }
  applyOperation(operation: Operation) {
    switch(operation.operationType) {
      case 'upsert':
        let matched = false;
        this.match(operation.fields.identifiers!, (i: number) => {
          this.items[i] = { ...this.items[i], ...operation.fields };
          matched = true;
        });
        if (!matched) {
          this.items.push(operation.fields as Item);
        }
      break;
      case 'merge':
        let winner = -1;
        this.match(operation.fields.identifiers!, (i: number) => {
          if (winner === -1) {
            winner = i;
          } else {
            this.items[winner].identifiers = this.items[winner].identifiers.concat(this.items[i].identifiers);
            this.items[i].identifiers = [];
            this.items[i].deleted = true;
          }
        });
        case 'fork':
          let added = -1;
          this.match(operation.fields.identifiers!, (i: number, id: string) => {
            if (added === -1) {
              added = this.items.length;
              this.items.push({ ...this.items[i]});
              this.items[added].identifiers = [];
            }
            this.items[added].identifiers.push(id);
            this.items[i].identifiers = this.items[i].identifiers.filter(x => x !== id);
          });
        default:
    }
  }
  async load(filename: string) {
    try {
      const buff = await fsPromises.readFile(filename);
      this.items = JSON.parse(buff.toString());
      console.log(`Loaded ${filename}`);
    } catch {
      console.log(`Failed to load ${filename}`);
    }
  }
  async save(filename: string) {
    await fsPromises.writeFile(filename, JSON.stringify(this.items, null, 2) + "\n");
    console.log(`Saved ${filename}`);
  }
  issueIdToIssueIds(issueId: string): string[] {
    for (let i = 0; i < this.items.length; i++) {
      for (let j = 0; j < this.items[i].identifiers.length; j++) {
        if (this.items[i].identifiers[j] === issueId) {
          return this.items[i].identifiers;
        }
      }
    }
    return [];
  }
}
