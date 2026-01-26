import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { env } from '../../../config/env';

export abstract class DynamoBaseRepository {
  protected readonly docClient: DynamoDBDocumentClient;

  constructor() {
    const client = new DynamoDBClient({ region: env.AWS_REGION });

    this.docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true, // Esto corrige el error del Date
        convertEmptyValues: true,
      },
    });
  }

  protected container(tableName: string) {
    return {
      upsert: async <T>(item: T): Promise<T> => {
        await this.docClient.send(
          new PutCommand({
            TableName: tableName,
            Item: item as any,
          }),
        );
        return item;
      },
    };
  }
}
