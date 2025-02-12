import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

interface PathPattern {
  pattern: string;
  params: string[];
}

interface PublicEndpoint {
  method: string;
  pathPattern: PathPattern;
  conditions?: (req: Request) => boolean;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const method = req.method;
  const path = req.path;
  const query = req.query;
  const apiKey = req.headers['x-api-key'];
  const isAdmin = (apiKey && apiKey === process.env.ADMIN_API_KEY);

  // 非Adminでもアクセス可能なエンドポイントの定義
  const publicEndpoints: PublicEndpoint[] = [
    // プロジェクト関連
    {
      method: 'GET',
      pathPattern: {
        pattern: '/projects',
        params: []
      }
    },
    {
      method: 'GET',
      pathPattern: {
        pattern: '/projects/:projectId',
        params: ['projectId']
      }
    },
    // コメント関連
    {
      method: 'GET',
      pathPattern: {
        pattern: '/projects/:projectId/comments',
        params: ['projectId']
      }
    },
    // 分析関連
    {
      method: 'GET',
      pathPattern: {
        pattern: '/projects/:projectId/questions/:questionId/stance-analysis',
        params: ['projectId', 'questionId']
      },
      conditions: (req) => req.query.forceRegenerate !== 'true'
    },
    {
      method: 'GET',
      pathPattern: {
        pattern: '/projects/:projectId/analysis',
        params: ['projectId']
      },
      conditions: (req) => req.query.forceRegenerate !== 'true'
    }
  ];

  // パスパターンがマッチするかチェックする関数
  function matchesPattern(path: string, pattern: PathPattern): boolean {
    const pathParts = path.split('/').filter(Boolean);
    const patternParts = pattern.pattern.split('/').filter(Boolean);

    if (pathParts.length !== patternParts.length) {
      return false;
    }

    const params: { [key: string]: string } = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        // パラメータの場合
        const paramName = patternPart.slice(1);
        if (!pattern.params.includes(paramName)) {
          return false;
        }
        // MongoDBのObjectIDの形式チェック(24文字の16進数)
        if (paramName.endsWith('Id') && !/^[0-9a-fA-F]{24}$/.test(pathPart)) {
          return false;
        }
        params[paramName] = pathPart;
      } else if (patternPart !== pathPart) {
        // 固定パスの場合は完全一致が必要
        return false;
      }
    }

    return true;
  }

  // 非Adminでもアクセス可能なエンドポイントかチェック
  for (const endpoint of publicEndpoints) {
    if (
      method === endpoint.method &&
      matchesPattern(path, endpoint.pathPattern) &&
      (!endpoint.conditions || endpoint.conditions(req))
    ) {
      return next();
    }
  }

  // 上記以外はすべてAdmin権限が必要
  if (!isAdmin) {
    throw new AppError(403, 'Admin privileges required');
  }

  next();
}