# import boto3
# import os
# from dotenv import load_dotenv

# # Load .env
# load_dotenv()

# AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
# AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
# AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-2")

# print(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)

# # Create SES client
# ses = boto3.client(
#     "ses",
#     aws_access_key_id=AWS_ACCESS_KEY_ID,
#     aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
#     region_name=AWS_REGION,
# )

# # Send mail
# response = ses.send_email(
#     Source="admin@thecaninenutritionist.com",  # domain must be verified in SES
#     Destination={"ToAddresses": ["abhisek85400@gmail.com"]},
#     Message={
#         "Subject": {"Data": "Hello from SES"},
#         "Body": {"Text": {"Data": "This is a test email sent via SES + boto3."}},
#     },
# )

# print("Email sent! Message ID:", response["MessageId"])

import boto3
import os
from dotenv import load_dotenv

# Load .env
load_dotenv()

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-2")

# Create SES client
ses = boto3.client(
    "ses",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
)

try:
    # Check sending quota (does not send any email)
    quota = ses.get_send_quota()
    print("Credentials are valid!")
    print("Max sendable emails:", quota)
except Exception as e:
    print("Credentials invalid or issue:", e)
