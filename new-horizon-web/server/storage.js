// Avatar storage on Neon Object Storage (or any S3-compatible store).
// Configure with the AWS_* variables that `neon deploy` / `neon env pull`
// write, plus AVATAR_BUCKET and AVATAR_PUBLIC_BASE_URL.
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export const AVATAR_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export function createAvatarStorage(env = process.env) {
  const bucket = env.AVATAR_BUCKET
  const publicBase = env.AVATAR_PUBLIC_BASE_URL
  if (!bucket || !publicBase || !env.AWS_ENDPOINT_URL_S3 || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    return null
  }
  const client = new S3Client({
    region: env.AWS_REGION || 'us-east-2',
    endpoint: env.AWS_ENDPOINT_URL_S3,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
  })
  return {
    async putAvatar(userId, body, contentType) {
      const ext = AVATAR_TYPES[contentType]
      if (!ext) throw Object.assign(new Error('Unsupported image type.'), { status: 415 })
      const key = `${userId}/avatar-${Date.now()}.${ext}`
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }))
      return `${publicBase.replace(/\/+$/, '')}/${key}`
    },
  }
}
