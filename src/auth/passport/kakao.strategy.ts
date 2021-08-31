import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-custom';
import { OauthUserRequest } from '../dto/oauth.dto';
import { OauthService } from '../services/oauth.service';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(private oauthService: OauthService) {
    super();
  }

  async validate(req: Request): Promise<OauthUserRequest> {
    const user = await this.oauthService.kakaoGetUser(req.body.accessToken);
    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      name: user.kakao_account.profile.nickname,
      email: user.kakao_account.email,
    };
  }
}
