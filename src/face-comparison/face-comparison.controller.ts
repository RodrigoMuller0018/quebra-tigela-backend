import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Body,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { FaceComparisonService } from './face-comparison.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

type UploadedImage = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Controller('face-comparison')
@UseGuards(JwtAuthGuard)
export class FaceComparisonController {
  constructor(private readonly faceService: FaceComparisonService) {}

  @Post('compare')
  @UseInterceptors(
    FilesInterceptor('images', 2, {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(
            new BadRequestException(
              'Apenas arquivos JPG, JPEG, PNG e WEBP são permitidos',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async compareFaces(@UploadedFiles() files: UploadedImage[]) {
    if (!files || files.length !== 2) {
      throw new BadRequestException('É necessário enviar exatamente 2 imagens');
    }

    const [image1, image2] = files;

    if (image1.size === 0 || image2.size === 0) {
      throw new BadRequestException('Uma ou ambas as imagens estão vazias');
    }

    return this.faceService.compareFaces(image1.buffer, image2.buffer);
  }

  @Post('verify-identity')
  @UseInterceptors(
    FilesInterceptor('photos', 2, {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(
            new BadRequestException(
              'Apenas arquivos JPG, JPEG, PNG e WEBP são permitidos',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async verifyIdentity(@UploadedFiles() files: UploadedImage[]) {
    if (!files || files.length !== 2) {
      throw new BadRequestException(
        'É necessário enviar foto do usuário e foto do documento',
      );
    }

    const [userPhoto, documentPhoto] = files;

    if (userPhoto.size === 0 || documentPhoto.size === 0) {
      throw new BadRequestException('Uma ou ambas as fotos estão vazias');
    }

    return this.faceService.verifyIdentity(
      userPhoto.buffer,
      documentPhoto.buffer,
    );
  }

  @Post('verify-artist')
  @UseInterceptors(
    FilesInterceptor('photos', 2, {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(
            new BadRequestException(
              'Apenas arquivos JPG, JPEG, PNG e WEBP são permitidos',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async verifyArtist(
    @UploadedFiles() files: UploadedImage[],
    @Body() body: { artistId: string },
  ) {
    if (!files || files.length !== 2) {
      throw new BadRequestException(
        'É necessário enviar foto atual e foto do documento',
      );
    }

    if (!body.artistId) {
      throw new BadRequestException('ID do artista é obrigatório');
    }

    const [currentPhoto, documentPhoto] = files;

    if (currentPhoto.size === 0 || documentPhoto.size === 0) {
      throw new BadRequestException('Uma ou ambas as fotos estão vazias');
    }

    const verificationResult = await this.faceService.verifyIdentity(
      currentPhoto.buffer,
      documentPhoto.buffer,
    );

    return {
      ...verificationResult,
      artistId: body.artistId,
      timestamp: new Date().toISOString(),
      status: verificationResult.verified ? 'APPROVED' : 'REJECTED',
    };
  }

  @Post('analyze-quality')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(
            new BadRequestException(
              'Apenas arquivos JPG, JPEG, PNG e WEBP são permitidos',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async analyzeImageQuality(@UploadedFile() file: UploadedImage) {
    if (!file) {
      throw new BadRequestException(
        'É necessário enviar uma imagem para análise',
      );
    }

    if (file.size === 0) {
      throw new BadRequestException('A imagem está vazia');
    }

    return this.faceService.analyzeFaceQuality(file.buffer);
  }
}
