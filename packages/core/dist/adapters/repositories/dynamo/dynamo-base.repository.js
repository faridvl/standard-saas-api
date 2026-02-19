"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoBaseRepository = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const env_1 = require("../../../config/env");
class DynamoBaseRepository {
    constructor() {
        const client = new client_dynamodb_1.DynamoDBClient({ region: env_1.env.AWS_REGION });
        this.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client, {
            marshallOptions: {
                removeUndefinedValues: true,
                convertClassInstanceToMap: true,
                convertEmptyValues: true,
            },
        });
    }
    container(tableName) {
        return {
            upsert: async (item) => {
                await this.docClient.send(new lib_dynamodb_1.PutCommand({
                    TableName: tableName,
                    Item: item,
                }));
                return item;
            },
        };
    }
}
exports.DynamoBaseRepository = DynamoBaseRepository;
//# sourceMappingURL=dynamo-base.repository.js.map