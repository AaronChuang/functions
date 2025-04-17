 //功能：處理 /images/* 的請求，從 R2 儲存貯體中取得對應物件並回傳

/**
 * 根據副檔名猜測 Content-Type
 * @param {string} filename - 包含副檔名的檔案名稱或路徑
 * @returns {string} - MIME 類型
 */
function getContentType(filename) {
  const extension = filename.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'ico':
      return 'image/x-icon';
    case 'avif':
      return 'image/avif';
    default:
      return 'application/octet-stream'; // 預設二進位流
  }
}

/**
 * Pages Function 處理 GET 請求
 * @param {object} context - 包含請求、環境變數、參數等的上下文物件
 */
export async function onRequestGet(context) {
  // 從上下文獲取環境變數 (包含 R2 繫結) 和請求參數
  const { request, env, params } = context;
  console.log(env);

  // 獲取 R2 儲存貯體繫結
  const R2_BUCKET = env['${R2_BINDING_VARIABLE_NAME}'];

  // 檢查 R2 繫結是否存在
  if (!R2_BUCKET) {
    const errorMsg = "R2 binding '${R2_BINDING_VARIABLE_NAME}' not found. Please check Pages Functions settings.";
    console.error(errorMsg);
    return new Response(errorMsg, { status: 500 });
  }

  // 從路由參數獲取請求的路徑部分
  // 例如，對於 /images/path/to/image.jpg，params.path 會是 ['path', 'to', 'image.jpg']
  const pathSegments = params.path;

  // 檢查路徑是否有效
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
    return new Response('Invalid image path', { status: 400 });
  }

  // 將路徑部分組合成 R2 物件的 Key
  // 假設圖片直接存放在 R2 儲存貯體的根目錄下，使用完整路徑作為 Key
  const objectKey = pathSegments.join('/');
  console.log(`Requesting R2 object: ${objectKey}`); // 在日誌中記錄請求的 Key

  try {
    // 從 R2 獲取物件
    const object = await R2_BUCKET.get(objectKey);

    // 如果物件不存在，回傳 404
    if (object === null) {
      console.error(`R2 object not found: ${objectKey}`);
      return new Response('Image not found', { status: 404 });
    }

    // 準備回應標頭
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag); // 設定 ETag
    headers.set('Content-Type', getContentType(objectKey)); // 設定 Content-Type
    headers.set('Cache-Control', 'public, max-age=604800');

    // 回傳 R2 物件的內容 (body) 和設定好的標頭
    return new Response(object.body, {
      headers,
    });

  } catch (e) {
    // 處理從 R2 獲取物件時可能發生的錯誤
    console.error(`Error fetching R2 object ${objectKey}: ${e}`);
    return new Response('Error fetching image from storage', { status: 500 });
  }
}

export async function onRequestHead(context) {
  const { env, params } = context;
  const R2_BUCKET = env['${R2_BINDING_VARIABLE_NAME}'];
  if (!R2_BUCKET) { return new Response(null, { status: 500 }); }
  const objectKey = params.path?.join('/');
  if (!objectKey) { return new Response(null, { status: 400 }); }

  try {
    const object = await R2_BUCKET.head(objectKey);
    if (object === null) { return new Response(null, { status: 404 }); }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Content-Type', getContentType(objectKey));
    headers.set('Cache-Control', 'public, max-age=604800');
    return new Response(null, { headers }); // HEAD 回應沒有 body
  } catch (e) {
    console.error(`Error handling HEAD for R2 object ${objectKey}: ${e}`);
    return new Response(null, { status: 500 });
  }
}