import { IVerificationResult } from "ethpkg/dist/IVerificationResult"

export interface IReleaseBase {
  name: string;
  error: string | void;     // only set when invalid
}

export interface IInvalidRelease {
  name?: string;
  error: string;
}

export interface IRelease {
  name: string;
  version: string;
  displayName: string;
  fileName: string;
  commit: string | void,
  publishedDate: Date;
  displayVersion: string,
  platform?: string,
  arch?: string,
  isPrerelease?: boolean, 
  channel: string | void;
  size: Number;
  tag: string;
  location: string;
  extractedPackagePath?: string;
  repository: string; // url
  error: void;
  signature?: string // url
  metadata?: string // url
  remote: boolean
}

export interface IVerifiedRelease extends IRelease {
  verificationResult: IVerificationResult, // TODO use proper typing
  data: Buffer
}


export interface IMetadata {
  name: string,
  icon: string; // url | relative path  
  md5?: string
  sha1?: string
  sha256?: string
  sha512?: string
  /*
  checksums: {
    md5?: string
    sha1?: string
    sha256?: string
    sha512?: string
  },
  signature: string,
  dependencies: string,
  permissions: string
  */
}

export interface IReleaseExtended extends IRelease {
  icon: string; // url | relative path
  checksums: {
    md5?: string
    sha1?: string
    sha256?: string
    sha512?: string
  },
  signature?: string
}

interface Publisher {
  publisherId: string, //uuid
  publisherName: string,
  displayName: string,
  flags: string
}

interface VersionInfo {}

interface PackageStatistics {
  install: Number;
  ratingCount: Number;
  avgRating: Number;
}

export interface IAppPackage extends IReleaseBase{
  packageId: string,
  packageName: string;
  flags: string;
  releaseDate: Date;
  lastUpdated: Date;
  publishedDate: Date;
  shortDescription: string;
  logo: string; //url
  publishers: Array<Publisher>
  statistics: PackageStatistics;
  versions: Array<VersionInfo>;
  readme: string; //url
  changelog: string; //url
  license: string; //url
}

