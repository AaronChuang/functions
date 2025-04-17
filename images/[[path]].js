 
/**
 * Pages Function 處理 GET 請求
 * @param {object} context - 包含請求、環境變數、參數等的上下文物件
 */
export async function onRequestGet(ctx) {
  const path = new URL(ctx.request.url).pathname.replace("/images/", "");
  const file = await ctx.env.MEDIA.get(path);
  if (!file) return new Response(null, { status: 404 });
  return new Response(file.body, {
    headers: { "Content-Type": file.httpMetadata.contentType },
  });
}
