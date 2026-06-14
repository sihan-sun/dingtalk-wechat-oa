import * as crypto from 'crypto';

/**
 * 企业微信回调加解密工具（纯函数）
 *
 * 企业微信回调使用 AES-256-CBC 加密消息体，
 * 并使用 SHA1 对 msg_signature 进行签名校验。
 *
 * 参考：企业微信官方加解密库逻辑
 */

/**
 * SHA1 签名校验
 *
 * @param token      企业微信后台配置的 Token
 * @param timestamp  时间戳
 * @param nonce      随机数
 * @param encrypt    加密的消息体
 * @param signature  待校验的 msg_signature
 */
export function verifySignature(
  token: string,
  timestamp: string,
  nonce: string,
  encrypt: string,
  signature: string,
): boolean {
  const arr = [token, timestamp, nonce, encrypt].sort();
  const str = arr.join('');
  const sha1 = crypto.createHash('sha1').update(str).digest('hex');
  return sha1 === signature;
}

/**
 * AES-256-CBC 解密
 *
 * EncodingAESKey 是 Base64 编码的 AES 密钥（43 字符），
 * 解码后得到 32 字节的 AES-256 密钥。
 *
 * 密文是 Base64 编码的 AES-CBC 加密数据，
 * IV 取密钥的前 16 字节。
 *
 * 解密后的明文结构：
 *   [16 bytes random] [4 bytes msg_len (big-endian)] [msg] [corpId]
 *
 * @param encrypt       Base64 编码的密文
 * @param encodingAesKey 企业微信后台配置的 EncodingAESKey
 * @returns { message: string; corpId: string }
 */
export function decryptMessage(
  encrypt: string,
  encodingAesKey: string,
): { message: string; corpId: string } {
  // AES Key = Base64 解码 EncodingAESKey（43 字符 → 32 字节）
  const aesKey = Buffer.from(encodingAesKey + '=', 'base64');

  // IV = AES Key 前 16 字节
  const iv = aesKey.subarray(0, 16);

  // 密文 Base64 解码
  const encrypted = Buffer.from(encrypt, 'base64');

  // AES-256-CBC 解密
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    aesKey,
    iv,
  );
  decipher.setAutoPadding(false);

  let decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  // 去除 PKCS#7 padding
  const padLength = decrypted[decrypted.length - 1];
  decrypted = decrypted.subarray(0, decrypted.length - padLength);

  // 解析消息结构
  // [16 bytes random] [4 bytes msg_len (big-endian)] [msg] [corpId]
  const msgLen = decrypted.readUInt32BE(16);
  const message = decrypted.subarray(20, 20 + msgLen).toString('utf8');
  const corpId = decrypted.subarray(20 + msgLen).toString('utf8');

  return { message, corpId };
}

/**
 * 加密消息（用于 URL 验证时加密 echostr）
 *
 * @param message        明文消息
 * @param corpId         企业 ID
 * @param encodingAesKey EncodingAESKey
 * @returns Base64 加密密文
 */
export function encryptMessage(
  message: string,
  corpId: string,
  encodingAesKey: string,
): string {
  const aesKey = Buffer.from(encodingAesKey + '=', 'base64');
  const iv = aesKey.subarray(0, 16);

  // 16 bytes random
  const random = crypto.randomBytes(16);

  // 4 bytes message length (big-endian)
  const msgBuffer = Buffer.from(message, 'utf8');
  const msgLen = Buffer.alloc(4);
  msgLen.writeUInt32BE(msgBuffer.length, 0);

  // corpId
  const corpIdBuffer = Buffer.from(corpId, 'utf8');

  // 拼接: random + msg_len + msg + corpId
  const plain = Buffer.concat([random, msgLen, msgBuffer, corpIdBuffer]);

  // PKCS#7 padding
  const blockSize = 32;
  const padLength = blockSize - (plain.length % blockSize);
  const padded = Buffer.concat([
    plain,
    Buffer.alloc(padLength, padLength),
  ]);

  // AES-256-CBC 加密
  const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
  cipher.setAutoPadding(false);

  const encrypted = Buffer.concat([
    cipher.update(padded),
    cipher.final(),
  ]);

  return encrypted.toString('base64');
}

/**
 * 解析企业微信回调的 XML 消息体
 *
 * 企业微信 POST 的加密 XML 格式：
 * <xml>
 *   <ToUserName><![CDATA[...]]></ToUserName>
 *   <Encrypt><![CDATA[...]]></Encrypt>
 *   <AgentID><![CDATA[...]]></AgentID>
 * </xml>
 *
 * 解密后的明文 XML 格式：
 * <xml>
 *   <ToUserName><![CDATA[...]]></ToUserName>
 *   <FromUserName><![CDATA[...]]></FromUserName>
 *   <CreateTime>...</CreateTime>
 *   <MsgType><![CDATA[event]]></MsgType>
 *   <Event><![CDATA[change_contact]]></Event>
 *   <ChangeType><![CDATA[create_user]]></ChangeType>
 *   <UserID><![CDATA[...]]></UserID>
 *   ...
 * </xml>
 *
 * 返回解析后的 JSON 对象
 */
export function parseWeComXml(
  xml: string,
): Record<string, string> {
  const result: Record<string, string> = {};

  // 匹配所有 <Tag>value</Tag> 或 <Tag><![CDATA[value]]></Tag>
  const tagRegex = /<(\w+)>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/\1>/gs;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(xml)) !== null) {
    const key = match[1];
    const value = match[2] !== undefined ? match[2] : match[3];
    result[key] = value;
  }

  return result;
}
