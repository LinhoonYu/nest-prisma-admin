/**
 * 树形结构构建工具。
 * 适用场景：Menu（菜单）、Dept（部门）等 parentId 自引用 + sort 排序的数据。
 */

export type TreeNode<T> = T & { children: TreeNode<T>[] };

export interface BuildTreeOptions<T> {
  idKey?: keyof T & string;
  parentIdKey?: keyof T & string;
  rootValue?: unknown;
  sortKey?: keyof T & string;
  /** 当父节点不在 items 中时，是否当作根节点处理（默认 true） */
  orphanAsRoot?: boolean;
}

/**
 * 将扁平数组构建为树形结构（O(n)）。
 *
 * @example
 * const items = [
 *   { id: 1, parentId: null, name: '根', sort: 1 },
 *   { id: 2, parentId: 1, name: '子', sort: 2 },
 * ]
 * buildTree(items) → [{ id: 1, children: [{ id: 2, children: [] }] }]
 */
export function buildTree<T extends Record<string, any>>(
  items: T[],
  options: BuildTreeOptions<T> = {},
): TreeNode<T>[] {
  const {
    idKey = 'id',
    parentIdKey = 'parentId',
    rootValue = null,
    sortKey,
    orphanAsRoot = true,
  } = options;

  const map = new Map<unknown, TreeNode<T>>();
  const roots: TreeNode<T>[] = [];

  // 第一遍：初始化所有节点，确保 map 中有引用
  for (const item of items) {
    map.set(item[idKey], { ...item, children: [] });
  }

  // 第二遍：挂载 children
  for (const item of items) {
    const node = map.get(item[idKey]);
    if (!node) continue;

    const parentId = item[parentIdKey];

    if (parentId === rootValue || parentId === undefined) {
      roots.push(node);
    } else {
      const parent = map.get(parentId);
      if (parent) {
        parent.children.push(node);
      } else if (orphanAsRoot) {
        roots.push(node);
      }
    }
  }

  // 对每个节点的 children 按 sortKey 排序
  if (sortKey) {
    const sortChildren = (nodes: TreeNode<T>[]) => {
      nodes.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey] ?? 0;
        const bVal = (b as Record<string, unknown>)[sortKey] ?? 0;
        if (typeof aVal === 'number' && typeof bVal === 'number')
          return aVal - bVal;
        if (typeof aVal === 'string' && typeof bVal === 'string')
          return aVal.localeCompare(bVal);
        return 0;
      });
      for (const node of nodes) {
        if (node.children.length > 0) sortChildren(node.children);
      }
    };
    sortChildren(roots);
  }

  return roots;
}
