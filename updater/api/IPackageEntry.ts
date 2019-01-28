export default interface IPackageEntry {
  name: string,
  relPath: string,
  size: number,
  type: string,
  stream?: any,
  getData: Function
}