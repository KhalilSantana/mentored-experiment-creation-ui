#!/bin/bash
echo "Starting MENTORED Topology Editor..."
echo "App will be available at http://localhost:4173"
echo ""
docker build --push --tag ghcr.io/khalilsantana/mentored-webui:latest .
docker run --rm -it --net=host ghcr.io/khalilsantana/mentored-webui:latest
