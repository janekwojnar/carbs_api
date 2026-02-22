from __future__ import annotations

import base64
import json
import os
from dataclasses import dataclass
from typing import Dict
from urllib import parse, request


class OAuthError(Exception):
    pass


@dataclass
class ProviderConfig:
    provider: str
    client_id: str
    client_secret: str
    auth_url: str
    token_url: str
    scope: str


def _read_json(req: request.Request) -> Dict[str, object]:
    try:
        with request.urlopen(req, timeout=20) as resp:
            payload = resp.read().decode("utf-8")
            return json.loads(payload)
    except Exception as exc:
        raise OAuthError(str(exc)) from exc


def provider_config(provider: str) -> ProviderConfig:
    if provider == "strava":
        cid = os.getenv("STRAVA_CLIENT_ID", "").strip()
        secret = os.getenv("STRAVA_CLIENT_SECRET", "").strip()
        if not cid or not secret:
            raise OAuthError("Strava OAuth is not configured")
        return ProviderConfig(
            provider="strava",
            client_id=cid,
            client_secret=secret,
            auth_url="https://www.strava.com/oauth/authorize",
            token_url="https://www.strava.com/oauth/token",
            scope=os.getenv("STRAVA_SCOPE", "read,activity:read_all"),
        )

    if provider == "garmin_connect":
        cid = os.getenv("GARMIN_CLIENT_ID", "").strip()
        secret = os.getenv("GARMIN_CLIENT_SECRET", "").strip()
        auth_url = os.getenv("GARMIN_OAUTH_AUTH_URL", "").strip()
        token_url = os.getenv("GARMIN_OAUTH_TOKEN_URL", "").strip()
        scope = os.getenv("GARMIN_SCOPE", "activity:read")
        if not cid or not secret or not auth_url or not token_url:
            raise OAuthError("Garmin OAuth is not fully configured")
        return ProviderConfig(
            provider="garmin_connect",
            client_id=cid,
            client_secret=secret,
            auth_url=auth_url,
            token_url=token_url,
            scope=scope,
        )

    raise OAuthError("Unsupported provider")


def build_authorize_url(provider: str, redirect_uri: str, state: str) -> str:
    cfg = provider_config(provider)
    if provider == "strava":
        query = parse.urlencode(
            {
                "client_id": cfg.client_id,
                "response_type": "code",
                "redirect_uri": redirect_uri,
                "approval_prompt": "auto",
                "scope": cfg.scope,
                "state": state,
            }
        )
        return f"{cfg.auth_url}?{query}"

    query = parse.urlencode(
        {
            "client_id": cfg.client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "scope": cfg.scope,
            "state": state,
        }
    )
    return f"{cfg.auth_url}?{query}"


def exchange_code(provider: str, code: str, redirect_uri: str) -> Dict[str, object]:
    cfg = provider_config(provider)

    if provider == "strava":
        body = parse.urlencode(
            {
                "client_id": cfg.client_id,
                "client_secret": cfg.client_secret,
                "code": code,
                "grant_type": "authorization_code",
            }
        ).encode("utf-8")
        req = request.Request(
            cfg.token_url,
            data=body,
            method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
        )
        return _read_json(req)

    token_auth_method = os.getenv("GARMIN_TOKEN_AUTH_METHOD", "body").strip().lower()
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
    }

    if token_auth_method == "basic":
        basic = base64.b64encode(f"{cfg.client_id}:{cfg.client_secret}".encode("utf-8")).decode("utf-8")
        body = parse.urlencode(payload).encode("utf-8")
        req = request.Request(
            cfg.token_url,
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "Authorization": f"Basic {basic}",
            },
        )
        return _read_json(req)

    payload["client_id"] = cfg.client_id
    payload["client_secret"] = cfg.client_secret
    body = parse.urlencode(payload).encode("utf-8")
    req = request.Request(
        cfg.token_url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
    )
    return _read_json(req)


def oauth_ready(provider: str) -> bool:
    try:
        provider_config(provider)
        return True
    except OAuthError:
        return False
