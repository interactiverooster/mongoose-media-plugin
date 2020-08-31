import Configuration from './Configuration';
import FileSystem from './FileSystem';
import { S3 } from 'aws-sdk';
import mongoose from 'mongoose';
import { Document as MongooseDocument } from "mongoose";
export interface Document extends MongooseDocument {
    uploaded: Date;
    created: Date;
    updated: Date;
    Etag: string;
    Error: string;
    ContentType: string;
    Size: number;
}
declare class MediaPlugin {
    readonly config: Configuration;
    readonly Schema: mongoose.Schema;
    readonly DB: mongoose;
    readonly FileSystem: FileSystem;
    readonly S3: S3;
    readonly mimeValidator: any;
    static fields: object[];
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
