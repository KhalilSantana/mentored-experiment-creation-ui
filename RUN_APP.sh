#!/bin/bash
echo "Starting MENTORED Topology Editor..."
echo "App will be available at http://localhost:4173"
echo ""
sudo docker run --rm -it --net=host -p 4173:4173 ghcr.io/khalilsantana/mentored-webui:latest
