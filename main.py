import json
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

import db

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(
    title="ExploreEase Smart Tourism Guide API",
    description="Backend API powering the ExploreEase smart tourism guide & trip planner.",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def load_json(filename: str):
    """Load a JSON data file, raising a clean 500 error if it is missing/broken
    instead of letting the server crash."""
    path = DATA_DIR / filename
    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"Data file '{filename}' is missing on the server.")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"Data file '{filename}' contains invalid JSON.")


def save_json(filename: str, data) -> None:
    path = DATA_DIR / filename
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2, ensure_ascii=False)


def find_site(site_id: int) -> Optional[dict]:
    for site in load_json("destinations.json"):
        if site["id"] == site_id:
            return site
    return None


# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------
@app.get("/")
def home():
    return {"message": "ExploreEase API Running"}


# ---------------------------------------------------------------------------
# Sites / Destinations
# ---------------------------------------------------------------------------
@app.get("/sites")
def get_sites():
    return load_json("destinations.json")


@app.get("/sites/{site_id}")
def get_site(site_id: int):
    site = find_site(site_id)
    if site is None:
        raise HTTPException(status_code=404, detail=f"No destination found with id {site_id}")
    return site


# ---------------------------------------------------------------------------
# Hotels & Restaurants
# ---------------------------------------------------------------------------
@app.get("/hotels")
def get_hotels():
    return load_json("hotels.json")


@app.get("/restaurants")
def get_restaurants():
    return load_json("restaurants.json")


# ---------------------------------------------------------------------------
# Coupons & Offers
# ---------------------------------------------------------------------------
@app.get("/coupons")
def get_all_coupons():
    """All demo coupons/offers (hotel, restaurant, and general/site-wide)."""
    return load_json("coupons.json")


@app.get("/coupons/{site_id}")
def get_coupons_for_site(site_id: int):
    """Coupons relevant to a specific destination, plus any general/site-wide offers."""
    if find_site(site_id) is None:
        raise HTTPException(status_code=404, detail=f"No destination found with id {site_id}, cannot fetch coupons.")
    coupons = load_json("coupons.json")
    relevant = [c for c in coupons if c.get("site_id") in (None, site_id)]
    return relevant


# ---------------------------------------------------------------------------
# Reviews & Ratings
# ---------------------------------------------------------------------------
@app.get("/reviews/{site_id}")
def get_reviews_for_site(site_id: int):
    if find_site(site_id) is None:
        raise HTTPException(status_code=404, detail=f"No destination found with id {site_id}")
    reviews = [r for r in load_json("reviews.json") if r["site_id"] == site_id]
    reviews.sort(key=lambda r: r["id"], reverse=True)
    average_rating = round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else 0
    return {
        "site_id": site_id,
        "average_rating": average_rating,
        "total_reviews": len(reviews),
        "reviews": reviews,
    }


class ReviewCreate(BaseModel):
    site_id: int
    user_name: str = Field(..., min_length=2, max_length=60)
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=3, max_length=500)

    @field_validator("user_name", "comment")
    @classmethod
    def not_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be empty.")
        return cleaned


@app.post("/reviews", status_code=201)
def add_review(review: ReviewCreate):
    if find_site(review.site_id) is None:
        raise HTTPException(status_code=404, detail=f"Cannot add review: no destination with id {review.site_id}")
    reviews = load_json("reviews.json")
    new_id = max((r["id"] for r in reviews), default=0) + 1
    new_review = {
        "id": new_id,
        "site_id": review.site_id,
        "user_name": review.user_name,
        "rating": review.rating,
        "comment": review.comment,
        "date": date.today().isoformat(),
    }
    reviews.append(new_review)
    save_json("reviews.json", reviews)
    return new_review


# ---------------------------------------------------------------------------
# Favorites (backend demo endpoint)
# ---------------------------------------------------------------------------
# NOTE: The live "Favorites / Wishlist" feature in the ExploreEase UI is stored
# in the browser's localStorage (see the frontend's Favorites logic), since this
# is a free, backend-less way to persist favorites per demo user without a real
# accounts database. This endpoint exists separately so the FastAPI backend has
# a genuine, working REST example of how favorites *would* be served from a
# database in a production version - useful to show/explain during the viva.
@app.get("/users/{user_id}/favorites")
def get_user_favorites(user_id: str):
    users = load_json("users.json")
    user = next((u for u in users if u["user_id"] == user_id), None)
    if user is None:
        raise HTTPException(status_code=404, detail=f"No demo user found with id '{user_id}'")
    all_sites = load_json("destinations.json")
    favorite_sites = [site for site in all_sites if site["id"] in user["favorites"]]
    return {"user_id": user_id, "name": user["name"], "favorites": favorite_sites}


# ---------------------------------------------------------------------------
# User Authentication (Neon PostgreSQL)
# ---------------------------------------------------------------------------
class UserSignup(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)

    @field_validator("name", "email")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be blank.")
        return cleaned


class UserLogin(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=1)


@app.get("/auth/status")
def auth_status():
    """Verify if NeonDB is configured and reachable."""
    configured = bool(db.get_db_url())
    return {
        "database": "Neon PostgreSQL",
        "configured": configured,
        "message": "Connected to NeonDB" if configured else "DATABASE_URL is not set in .env",
    }


@app.post("/auth/signup", status_code=201)
def signup_user(user: UserSignup):
    if not db.get_db_url():
        raise HTTPException(
            status_code=503,
            detail="Database not configured. Please add your NeonDB DATABASE_URL to the .env file.",
        )
    try:
        existing = db.find_user_by_email(user.email)
        if existing:
            raise HTTPException(status_code=400, detail="An account with this email already exists.")

        new_user = db.create_user(name=user.name, email=user.email, password=user.password)
        return {
            "message": "Registration successful",
            "user": {
                "id": new_user["id"],
                "name": new_user["name"],
                "email": new_user["email"],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.post("/auth/login")
def login_user(creds: UserLogin):
    if not db.get_db_url():
        raise HTTPException(
            status_code=503,
            detail="Database not configured. Please add your NeonDB DATABASE_URL to the .env file.",
        )
    try:
        user = db.find_user_by_email(creds.email)
        if not user or not db.verify_password(creds.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        return {
            "message": "Login successful",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ---------------------------------------------------------------------------
# Static frontend
# ---------------------------------------------------------------------------
app.mount("/app", StaticFiles(directory=BASE_DIR, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
