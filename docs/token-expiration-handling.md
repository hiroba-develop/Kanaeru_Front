# トークン有効期限切れ対応（自動ログアウト）

## 概要

APIリクエスト時に401エラー（Unauthorized）が発生した場合、自動的にログアウトしてログイン画面にリダイレクトする機能を実装しました。

## 実装ファイル

### 1. `src/utils/apiErrorHandler.ts`（新規作成）

APIエラーをハンドリングするユーティリティ。

**主な機能：**
- 401エラーを検知して自動ログアウトを実行
- `withErrorHandling`関数でAPI呼び出しをラップ
- AuthContextからコールバックを受け取り

**使用例：**
```typescript
import { withErrorHandling } from '../utils/apiErrorHandler';
import { Service } from '../api/services/Service';

// API呼び出しをラップ
const userInfo = await withErrorHandling(() => 
  Service.getApiSettingUser(userId)
);
```

### 2. `src/utils/apiHelpers.ts`（新規作成）

エラーハンドリング付きAPI呼び出しのサンプル実装。

**提供関数：**
- `fetchUserWithErrorHandling` - ユーザー情報取得
- `fetchMandalaChartsWithErrorHandling` - マンダラチャート取得
- `callApiWithErrorHandling` - 汎用ラッパー

### 3. `src/contexts/AuthContext.tsx`（更新）

**追加項目：**
- `sessionExpired` - セッション期限切れフラグ
- `clearSessionExpired` - フラグをクリアする関数
- `handleSessionExpired` - 401エラー時のログアウト処理

**変更内容：**
- エラーハンドラーのコールバック登録（useEffect）
- API呼び出しに`withErrorHandling`を適用
- Cookie復元時とloadUserSetup時にエラーハンドリング追加

### 4. `src/pages/Login.tsx`（更新）

**追加機能：**
- セッション期限切れメッセージの自動表示
- `sessionExpired`フラグに基づいてエラーメッセージを表示

## 動作フロー

### 1. 通常のAPI呼び出し

```
API呼び出し → 成功 → 通常処理
```

### 2. トークン期限切れ時

```
API呼び出し
  ↓
401エラー発生
  ↓
apiErrorHandler.handleApiError()
  ↓
sessionExpiredCallback() - sessionExpiredフラグをtrue
  ↓
logoutCallback() - handleSessionExpired()
  ↓
- ユーザー状態をクリア
- Cookieをクリア
- shouldRedirectToLoginをtrue
  ↓
ログイン画面にリダイレクト
  ↓
「セッションの有効期限が切れました」メッセージ表示
```

## 使い方

### API呼び出し時にエラーハンドリングを適用

**方法1: withErrorHandlingを直接使用**
```typescript
import { withErrorHandling } from '../utils/apiErrorHandler';
import { Service } from '../api/services/Service';

const fetchData = async () => {
  try {
    const result = await withErrorHandling(() => 
      Service.anyApiMethod(params)
    );
    // 成功時の処理
  } catch (error) {
    // エラー処理（401以外のエラー）
  }
};
```

**方法2: ヘルパー関数を使用**
```typescript
import { callApiWithErrorHandling } from '../utils/apiHelpers';
import { Service } from '../api/services/Service';

const result = await callApiWithErrorHandling(() => 
  Service.anyApiMethod(params)
);
```

### コンポーネントで使用

```typescript
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { sessionExpired, clearSessionExpired } = useAuth();
  
  useEffect(() => {
    if (sessionExpired) {
      // セッション期限切れ時の処理
      console.log('セッションが期限切れです');
      clearSessionExpired();
    }
  }, [sessionExpired, clearSessionExpired]);
  
  // ...
};
```

## 注意事項

1. **自動生成ファイルは編集していません**
   - `Service.ts`や`request.ts`は手動編集せず、独立したエラーハンドラーで対応

2. **既存のAPI呼び出しへの適用**
   - 現在はAuthContext内のAPI呼び出しに適用済み
   - 他のコンポーネントでのAPI呼び出しも`withErrorHandling`でラップ推奨

3. **ログアウト処理**
   - 401エラー時は、APIを呼ばずにローカルのみクリア
   - 通常のログアウトボタンは、APIを呼び出してサーバー側でトークン無効化

4. **エラーの再スロー**
   - `withErrorHandling`は401エラーを処理した後もエラーを再スローします
   - 呼び出し元でtry-catchが必要な場合は適切に処理してください

## テスト方法

### 手動テスト

1. ログインしてトークンを取得
2. ブラウザのDevToolsでCookieの`authToken`を削除または改ざん
3. 任意のAPI呼び出しを実行（ページ遷移など）
4. 自動的にログイン画面にリダイレクトされることを確認
5. 「セッションの有効期限が切れました」メッセージが表示されることを確認

### 期限切れのテスト

1. Cookieの有効期限を短く設定（例：1分）
2. 1分待機
3. ページをリロードまたはAPI呼び出し
4. 自動ログアウトが実行されることを確認

## 今後の拡張案

1. **セッションタイムアウト警告**
   - 期限切れ5分前に警告モーダルを表示
   - 「セッションを延長」ボタンでトークンリフレッシュ

2. **リトライ機能**
   - 401エラー時に一度だけトークンリフレッシュを試みる
   - 失敗したら自動ログアウト

3. **ログイン試行回数制限**
   - 連続ログイン失敗時の一時ロック機能
