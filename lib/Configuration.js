"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_sdk_1 = require("aws-sdk");
class Configuration {
    constructor(config) {
        this.AWS_ACCESS_KEY_ID = config.AWS_ACCESS_KEY_ID ? config.AWS_ACCESS_KEY_ID : process.env.AWS_ACCESS_KEY_ID;
        this.AWS_SECRET_ACCESS_KEY = config.AWS_SECRET_ACCESS_KEY
            ? config.AWS_SECRET_ACCESS_KEY
            : process.env.AWS_SECRET_ACCESS_KEY;
        this.bucket = config.bucket;
        this.region = config.region || 'us-east-1';
        this.types = (config.types && Array.isArray(config.types))
            ? config.types
            : ["image/*", "video/mp4", "video/webm", "video/quicktime", "application/pdf", "text/*"];
        /**
         * @todo Process media
         * @body Create resize images and normalise video content for web and compatibility ( webm + mp4 etc. ).
         */
        // this.processImages = config.processImages;
        // this.imageDimensions = config.imageDimensions;
        // this.processVideos = config.processVideos;
        this.createBucket = config.createBucket;
        if (!this.AWS_ACCESS_KEY_ID || !this.AWS_SECRET_ACCESS_KEY) {
            throw new Error(`Both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY need to be set,got
                AWS_ACCESS_KEY_ID=${this.AWS_ACCESS_KEY_ID} and AWS_SECRET_ACCESS_KEY=${this.AWS_SECRET_ACCESS_KEY}.
                Pass in arguments or in your env properties.`);
        }
        this.Credentials = new aws_sdk_1.Credentials(this.AWS_ACCESS_KEY_ID, this.AWS_SECRET_ACCESS_KEY);
        this.AWS = new aws_sdk_1.Config({
            credentials: this.Credentials,
            region: this.region
        });
        this.S3 = new aws_sdk_1.S3({
            apiVersion: '2006-03-01'
        });
    }
    async Configure() {
        try {
            await this._verifyConfig();
            return this;
        }
        catch (e) {
            if (e.statusCode === 403) {
                e.message = `Credentials are not authorised to access bucket: "${this.bucket}"`;
                throw e;
            }
            if (e.statusCode === 404 && !this.createBucket) {
                e.message = `Bucket "${this.bucket}" does not exist and 'createBucket' is not set.`;
                throw e;
            }
            if (e.statusCode === 404) {
                await this._createBucket();
                return this.Configure();
            }
            throw e;
        }
    }
    async _verifyConfig() {
        return new Promise((resolve, reject) => {
            this.S3.headBucket({ Bucket: this.bucket }, (err, data) => {
                if (err) {
                    return reject(err);
                }
                this.verified = true;
                return resolve(data);
            });
        });
    }
    async _createBucket() {
        return new Promise((resolve, reject) => {
            this.S3.createBucket({
                Bucket: this.bucket,
                ACL: "private"
            }, (err, data) => {
                if (err) {
                    return reject(err);
                }
                this.Bucket = data;
                return resolve(data);
            });
        });
    }
}
exports.default = Configuration;
