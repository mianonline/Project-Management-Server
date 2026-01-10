import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';

export const signCloudinary = async (req: Request, res: Response) => {
    try {
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default';

        if (!apiSecret) {
            return res.status(500).json({ message: 'CLOUDINARY_API_SECRET is not defined in environment variables' });
        }

        const timestamp = Math.round(new Date().getTime() / 1000);
        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp: timestamp,
                upload_preset: uploadPreset,
            },
            apiSecret
        );

        res.status(200).json({
            signature,
            timestamp,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            upload_preset: uploadPreset
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error generating Cloudinary signature', error: error.message });
    }
};
