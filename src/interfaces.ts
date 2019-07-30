export interface IPackageParams {
  scope?: string;
  package: string;
  version?: string;
  0?: string;
}

export interface IPackageQuery {
  tree?: any;
  flat?: any;
}

export interface TreeNode {
  isDirectory: boolean;
  children: TreeNode[];
  name: string;
  size?: number;
}