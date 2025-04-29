# Waymark Interview Prep
[Requirements Document](https://docs.google.com/document/d/1poL2NkxOigxMtuXDueo2w5xFYuBsCPDtR32QakWTfdk/edit?tab=t.0)

[Design Document](https://docs.google.com/document/d/1HcokzJz4GjLYQRd4hEuQJuwtPxHXnA3bmrw23BaI-BA/edit?usp=sharing)


## Directory
./ - contains application code for UI and API using nextjs
/infrastructure - contains iac for AWS using cloudformation


# Commands
`Switch AWS profiles `export AWS_PROFILE=waymark`

## Cloudformation
Validate: `aws cloudformation validate-template --template-body file://infrastructure/main.yaml`
Create Stack: `aws cloudformation create-stack --stack-name waymark-audio-uploads-dev --template-body file://infrastructure/main.yaml --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM`
Update Stack: `aws cloudformation update-stack --stack-name waymark-audio-uploads-dev --template-body file://infrastructure/main.yaml --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM`
Delete Stack: `aws cloudformation delete-stack --stack-name waymark-audio-uploads-dev`

# Incomplete/Not started work
- Auth middleware - secure all routes
- Monitoring and Alerting
- UI/UX
- HD transcoding - follow same pattern as browser quality transcoding
- Auto-scaling
- Request handling
- Typings
- Secure the processed urls - consider signed urls here
- Refactor to use configuration (aka productionize it)
- Add application layers (service layers, data access layers, etc)
