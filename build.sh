#!/bin/bash
npm run build
docker build -t sonarqube-mcp-enhanced .