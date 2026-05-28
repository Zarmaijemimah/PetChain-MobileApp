import "express";

declare module "express-serve-static-core" {
  interface Request {
    db?: any;
    user?: any;
  }
}