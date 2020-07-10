import { S3, Credentials, Config as AWSConfig } from 'aws-sdk';
/**
 * @todo Enable other cloud providers ( Google Cloud / Azure )
 * @body Only AWS is currently supported.
 */
interface Config {
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    bucket: string;
    types?: string[];
    region?: string;
    createBucket?: boolean;
    cache?: boolean;
    timeout?: number;
    skipStreamInspection?: boolean;
}
export default class Configuration {
    readonly AWS_ACCESS_KEY_ID: string;
    readonly AWS_SECRET_ACCESS_KEY: string;
    readonly bucket: string;
    readonly S3: S3;
    readonly AWS: AWSConfig;
    readonly region: string;
    readonly createBucket: boolean;
    readonly processImages?: boolean;
    readonly imageDimensions?: [[number, number]];
    readonly processVideos?: boolean;
    readonly types?: string[];
    readonly cache: boolean;
    private verified;
    Credentials: Credentials;
    Bucket: any;
    skipStreamInspection: boolean;
    constructor(config: Config);
    Configure(): Promise<Configuration>;
    private _verifyConfig;
    private _createBucket;
}
export {};
