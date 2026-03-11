export interface Serializable {
  serialize(): string;
}

export interface Loggable extends Serializable {
  log(message: string): void;
}

export type UserId = string;

export type UserRecord = {
  id: UserId;
  name: string;
};

export enum Status {
  Active = 'active',
  Inactive = 'inactive',
}

export class UserStore implements Loggable {
  serialize(): string {
    return JSON.stringify(this);
  }
  log(message: string): void {
    console.log(message);
  }
  getStatus(): Status {
    return Status.Active;
  }
}
