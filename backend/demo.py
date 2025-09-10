import os
from dotenv import load_dotenv
from botocore.client import Config
import boto3
from uuid import uuid4

# Load .env
load_dotenv()

def get_r2_client():
    return boto3.client(
        service_name="s3",
        region_name='auto',  # important for R2
        aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
        endpoint_url=os.getenv("R2_ENDPOINT")
    )

s3 = get_r2_client()
bucket_name = "demo"  # replace with your R2 bucket

# 1. Check if bucket is accessible
try:
    s3.head_bucket(Bucket=bucket_name)
    print(f"✅ Bucket {bucket_name} is accessible!")
except Exception as e:
    print(f"❌ Bucket check failed: {e}")

# 2. Upload test file
key = f"test-{uuid4()}.txt"
with open("test.txt", "w") as f:
    f.write("Hello from R2!")

s3.upload_file("test.txt", bucket_name, key)
print(f"✅ Uploaded to {bucket_name}/{key}")

# 3. Download it back
s3.download_file(bucket_name, key, "downloaded.txt")
print("✅ Downloaded file contents:", open("downloaded.txt").read())
