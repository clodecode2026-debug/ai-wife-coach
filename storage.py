import os
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import logging

logger = logging.getLogger(__name__)

class S3StorageManager:
    def __init__(self):
        self.endpoint_url = os.environ.get("S3_ENDPOINT", "https://s3.us-east-1.storjshare.io")
        self.access_key = os.environ.get("S3_ACCESS_KEY")
        self.secret_key = os.environ.get("S3_SECRET_KEY")
        self.bucket_name = os.environ.get("S3_BUCKET", "ai-wife-coach-audio")
        self.region_name = os.environ.get("S3_REGION", "us-east-1")
        
        self.s3_client = None
        if self.access_key and self.secret_key:
            try:
                self.s3_client = boto3.client(
                    "s3",
                    endpoint_url=self.endpoint_url,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region_name
                )
                logger.info("S3 Storj storage client успешно инициализирован")
            except Exception as e:
                logger.error(f"Ошибка инициализации S3 клиента: {e}")

    def upload_file_bytes(self, file_bytes: bytes, filename: str, content_type: str = "audio/mpeg") -> str:
        if not self.s3_client:
            logger.warning("S3 клиент не инициализирован (отсутствуют ключи S3_ACCESS_KEY / S3_SECRET_KEY)")
            return ""
        
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=filename,
                Body=file_bytes,
                ContentType=content_type
            )
            file_url = f"{self.endpoint_url}/{self.bucket_name}/{filename}"
            logger.info(f"Файл успешно загружен в S3 Storj: {file_url}")
            return file_url
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Ошибка загрузки файла в S3: {e}")
            return ""

s3_storage = S3StorageManager()
