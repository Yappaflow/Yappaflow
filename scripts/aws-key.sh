for KEY_NAME in OPENROUTER_API_KEY EXA_API_KEY VOYAGE_API_KEY MCP_AUTH_TOKEN; do
  echo ""
  echo "=================================================="
  echo "Now copy the value of $KEY_NAME from Railway, then press Enter."
  read -r
  
  # Open nano so you can paste
  echo "Paste into the next file. Save with Ctrl+O, Enter, Ctrl+X"
  nano /tmp/key.tmp
  
  # Push it
  aws ssm put-parameter \
    --name "/yappaflow/mcp/$KEY_NAME" \
    --value "$(cat /tmp/key.tmp)" \
    --type SecureString \
    --overwrite \
    --region $AWS_REGION > /dev/null
  
  # Verify
  echo "Stored value first 30 chars: $(aws ssm get-parameter --name "/yappaflow/mcp/$KEY_NAME" --with-decryption --region $AWS_REGION --query 'Parameter.Value' --output text | head -c 30)"
  
  rm -f /tmp/key.tmp
done
echo ""
echo "Done. All 4 secrets stored."