import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# SMTP server settings (Brevo example)
SMTP_SERVER = "smtp-relay.brevo.com"
SMTP_PORT = 587  # TLS
SMTP_USERNAME = "975d87001@smtp-brevo.com"  # usually your account email
SMTP_PASSWORD = "7pcYqPEV1kb2AKrO"  # generate an SMTP key in Brevo dashboard

# Email details
sender_email = "admin@thecaninenutritionist.com"

def send_email(receiver_email: str, subject: str, body: str, content_type: str = "plain"):
    """
    Send an email using Brevo SMTP.

    Args:
        receiver_email (str): Recipient email address
        subject (str): Subject of the email
        body (str): Email body (string or HTML)
        content_type (str): "plain" for text or "html" for HTML content
    """
    try:
        # Create the email
        msg = MIMEMultipart()
        msg["From"] = sender_email
        msg["To"] = receiver_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, content_type))

        # Connect to SMTP server
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)

        # Send email
        server.sendmail(sender_email, receiver_email, msg.as_string())
        print(f"✅ Email sent successfully to {receiver_email}")

        server.quit()
    except Exception as e:
        print("❌ Error sending email:", e)
