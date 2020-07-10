/// <reference types="node" />
import Configuration from './Configuration';
import { S3 } from 'aws-sdk';
import * as stream from "stream";
declare class MockStream extends stream.PassThrough {
    readonly S3: S3;
    readonly bucket: string;
    readonly key: string;
    readonly options: object;
    constructor(s3: S3, Bucket: string, Key: string, options?: object);
}
/**
 * @todo Create local cache option
 * @body Makes sense and would improve performance / network costs to provide a local cache option xxGB/MB etc for frequently used files.
 */
export default class FileSystem {
    readonly bucket: string;
    readonly S3: S3;
    readonly useCache: boolean;
    constructor(Connector: Configuration);
    private checkLocalCache;
    createReadStream(key: string, doc: any, range?: string): stream.Readable;
    createWriteStream(key: string, options?: object): MockStream;
    head(key: any): Promise<unknown>;
    unlink(key: string): Promise<boolean>;
    getSignedURL(key: string, expiry?: number): string;
}
export {};
