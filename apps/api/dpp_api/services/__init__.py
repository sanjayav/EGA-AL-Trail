"""Service layer — orchestrates the DPP issuance pipeline.

The pipeline (SDD §6.1) is the platform's defining flow:
    1. cast_events   — receive + validate
    2. dpp_generator — assemble canonical DPP from cast event + reference data
    3. signer        — wrap in W3C VC envelope, Ed25519-sign
    4. qr            — mint PNG / SVG / ZPL renderings
    5. publish       — flip lifecycle state, write audit log, update resolver
"""
