import Configuration from './Configuration';
import FileSystem from './FileSystem';
import { S3 } from 'aws-sdk';
import mongoose from 'mongoose';
declare class MediaPlugin {
    readonly config: Configuration;
    readonly Schema: mongoose.Schema;
    readonly DB: mongoose;
    readonly FileSystem: FileSystem;
    readonly S3: S3;
    readonly mimeValidator: any;
    readonly fields: object[];
    constructor(schema: mongoose.Schema, config: Configuration);
    static path(doc: any): string;
    private makeMimeValidator;
    private addFields;
    private UpStream;
    private checkMime;
    private inspect;
}
export default function (schema: mongoose.Schema, config: Configuration): MediaPlugin;
export {};
