declare module "node:sqlite" {
  export class StatementSync {
    run(...params: (string | number | bigint | null | Buffer)[]): {
      changes: number;
      lastInsertRowid: number | bigint;
    };
    all(...params: (string | number | bigint | null | Buffer)[]): any[];
    get(...params: (string | number | bigint | null | Buffer)[]): any;
  }
  export class DatabaseSync {
    constructor(location: string, options?: { open?: boolean; readOnly?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}

