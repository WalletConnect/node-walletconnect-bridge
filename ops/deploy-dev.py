#!/usr/bin/env python3
# Why python? Mostly because it checks that a variables is declared
import os

templateDeploy="""
version: '3.7'

services:
  redis:
    ports:
      - "6379:6379"
  node:
    ports:
      - "5001:5001"
""""
