import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Role } from '@hotel/shared';
import { prisma } from './database';

export function configurePassport(): typeof passport {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:8000';

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${baseUrl}/api/auth/google/callback`,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value?.toLowerCase();
            const avatar = profile.photos?.[0]?.value;
            let user = await prisma.user.findFirst({
              where: {
                OR: [
                  { googleId: profile.id },
                  ...(email ? [{ email }] : []),
                ],
              },
              include: { staff: true },
            });

            if (!user) {
              user = await prisma.user.create({
                data: {
                  name: profile.displayName || 'Google User',
                  email: email || null,
                  googleId: profile.id,
                  avatar: avatar || null,
                  role: Role.USER,
                  isVerified: true,
                },
                include: { staff: true },
              });
            } else if (!user.googleId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  googleId: profile.id,
                  avatar: user.avatar || avatar || null,
                  isVerified: true,
                },
                include: { staff: true },
              });
            }

            return done(null, {
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              role: user.role,
              staffRole: user.staff?.staffRole ?? null,
              hotelId: user.staff?.hotelId ?? null,
              staffId: user.staff?.id ?? null,
              points: user.points,
            });
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
  }

  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: `${baseUrl}/api/auth/facebook/callback`,
          profileFields: ['id', 'displayName', 'emails', 'photos'],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value?.toLowerCase();
            const avatar = profile.photos?.[0]?.value;
            let user = await prisma.user.findFirst({
              where: {
                OR: [
                  { facebookId: profile.id },
                  ...(email ? [{ email }] : []),
                ],
              },
              include: { staff: true },
            });

            if (!user) {
              user = await prisma.user.create({
                data: {
                  name: profile.displayName || 'Facebook User',
                  email: email || null,
                  facebookId: profile.id,
                  avatar: avatar || null,
                  role: Role.USER,
                  isVerified: true,
                },
                include: { staff: true },
              });
            } else if (!user.facebookId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  facebookId: profile.id,
                  avatar: user.avatar || avatar || null,
                  isVerified: true,
                },
                include: { staff: true },
              });
            }

            return done(null, {
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              role: user.role,
              staffRole: user.staff?.staffRole ?? null,
              hotelId: user.staff?.hotelId ?? null,
              staffId: user.staff?.id ?? null,
              points: user.points,
            });
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
  }

  return passport;
}

export { passport };
