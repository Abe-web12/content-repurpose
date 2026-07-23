import { v2 as cloudinary } from "cloudinary"

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error("Missing Cloudinary configuration (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)");
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
})

export { cloudinary }

export function uploadBuffer(
  buffer: Buffer,
  options: {
    folder?: string
    publicId?: string
  } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? "repurposeai",
        public_id: options.publicId,
        resource_type: "image",
        transformation: { quality: "auto", fetch_format: "auto" },
      },
      (error, result) => {
        if (error) {
          reject(new Error(error.message))
          return
        }
        resolve(result!.secure_url)
      }
    )

    uploadStream.end(buffer)
  })
}
