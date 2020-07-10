"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FileSystem_1 = __importDefault(require("./FileSystem"));
const StreamType_1 = __importDefault(require("./StreamType"));
const mongoose_1 = __importDefault(require("mongoose"));
const stream_mmmagic_1 = __importDefault(require("stream-mmmagic"));
class MediaPlugin {
    constructor(schema, config) {
        this.fields = [
            { uploaded: { type: Date } },
            { created: { type: Date } },
            { updated: { type: Date, default: Date.now() } },
            { ETag: { type: String } },
            { Error: { type: String } },
            { ContentType: { type: String, default: "application/octet-stream" } },
            { Size: { type: Number, default: 0 } },
            { __Stream: { type: StreamType_1.default, select: false } },
            { __pendingDelete: { type: Boolean, default: false } }
        ];
        let self = this;
        this.config = config;
        this.Schema = schema;
        this.DB = mongoose_1.default;
        this.FileSystem = new FileSystem_1.default(config);
        this.Schema.options = { ...this.Schema.options, ...{ toObject: { virtuals: true } } };
        this.DB.Schema.Types.Stream = StreamType_1.default;
        this.addFields();
        this.mimeValidator = this.makeMimeValidator();
        this.Schema.methods.range = function (range) {
            return self.FileSystem.createReadStream(MediaPlugin.path(this), range);
        };
        this.Schema.pre("save", function (next) {
            if (this.isNew) {
                this.created = new Date();
            }
            else {
                this.updated = new Date();
            }
            return self.UpStream(this, next);
        });
        this.Schema.pre("remove", { document: true }, function (next) {
            let doc = this;
            doc.__pendingDelete = true;
            doc.save((err, flagged) => {
                if (err) {
                    return next(err);
                }
                self.FileSystem.unlink(MediaPlugin.path(flagged))
                    .then(() => {
                    return next();
                });
            });
        });
        this.Schema.virtual("body")
            .get(function () {
            if (this.__pendingDelete || this.__Stream) {
                return null;
            }
            return self.FileSystem.createReadStream(this._id.toString());
        })
            .set(function (v) {
            this.__Stream = v;
        });
    }
    static path(doc) {
        return doc._id.toString();
    }
    makeMimeValidator() {
        let mimeMap = {};
        this.config.types.map((type) => {
            let media = type.split("/")[0], ext = type.split("/")[1];
            if (!media || !ext) {
                return;
            }
            if (mimeMap[media] === "*") {
                return;
            }
            if (!mimeMap[media]) {
                if (ext === "*") {
                    return mimeMap[media] = ext;
                }
                mimeMap[media] = [];
            }
            return mimeMap[media].push(ext);
        });
        return function (type) {
            let media = type.split("/")[0], ext = type.split("/")[1];
            if (!media || !ext) {
                return false;
            }
            if (!mimeMap[media])
                return false;
            if (mimeMap[media] === "*")
                return true;
            return mimeMap[media].indexOf(ext) !== -1;
        };
    }
    addFields() {
        this.fields.map((field) => {
            this.Schema.add(field);
        });
    }
    UpStream(doc, next) {
        let local, remote;
        if (doc.isModified("__Stream")) {
            local = doc.__Stream;
            this.inspect(local)
                .then((result) => this.checkMime(result, doc))
                .then((result) => {
                let options = null;
                if (result.mime) {
                    options = {
                        ContentType: result.mime.type,
                        ContentEncoding: result.mime.encoding
                    };
                    doc.ContentType = options.ContentType;
                }
                else {
                    options = {
                        ContentType: doc.ContentType,
                        ContentEncoding: "utf-8"
                    };
                }
                remote = this.FileSystem.createWriteStream(MediaPlugin.path(doc), options);
                result.output.pipe(remote);
                remote.on("error", (err) => {
                    return next(err);
                });
                remote.on("complete", (data) => {
                    doc.ETag = data.ETag;
                    doc.Size = data.size;
                    doc.uploaded = new Date();
                    doc.error = undefined;
                    doc.__Stream = undefined;
                    return next();
                });
            })
                .catch((e) => {
                if (local && local.close) {
                    local.close();
                }
                return next(e);
            });
        }
        else {
            return next();
        }
    }
    checkMime(fileData, doc) {
        return new Promise((accept, reject) => {
            if (this.config.skipStreamInspection) {
                return accept(fileData);
            }
            let valid = this.mimeValidator(fileData.mime.type);
            if (valid) {
                return accept(fileData);
            }
            return reject(new Error(`Stream interrupted as ${fileData.mime.type} ( ${doc.ContentType} in doc ),` +
                ` which is not accepted. Accepted file types are ` +
                `${this.config.types.map((type) => { return `${type}, `; })}. `));
        });
    }
    inspect(input) {
        return new Promise((accept, reject) => {
            if (this.config.skipStreamInspection) {
                return accept({
                    mime: false,
                    output: input
                });
            }
            stream_mmmagic_1.default(input, function (err, mime, output) {
                if (err) {
                    return reject(err);
                }
                return accept({
                    mime: mime,
                    output: output
                });
            });
        });
    }
}
function default_1(schema, config) {
    return new MediaPlugin(schema, config);
}
exports.default = default_1;
;
