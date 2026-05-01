for key in EXA_API_KEY VOYAGE_API_KEY MCP_AUTH_TOKEN; do
  echo "=== $key (first 30 chars): ==="
  aws ssm get-parameter \
    --name "/yappaflow/mcp/$key" \
    --with-decryption \
    --region $AWS_REGION \
    --query 'Parameter.Value' \
    --output text | head -c 30
  echo
done