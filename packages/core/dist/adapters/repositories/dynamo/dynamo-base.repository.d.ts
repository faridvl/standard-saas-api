import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
export declare abstract class DynamoBaseRepository {
    protected readonly docClient: DynamoDBDocumentClient;
    constructor();
    protected container(tableName: string): {
        upsert: <T>(item: T) => Promise<T>;
    };
}
