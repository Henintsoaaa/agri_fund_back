import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';

export interface PlatformSettings {
  platformName: string;
  platformEmail: string;
  minInvestment: number;
  maxInvestment: number;
  platformFee: number;
  enableEmailNotifications: boolean;
  enablePushNotifications: boolean;
  notifyOnNewProject: boolean;
  notifyOnInvestment: boolean;
  requireTwoFactor: boolean;
  sessionTimeout: number;
  passwordMinLength: number;
  autoBackupEnabled: boolean;
  backupFrequency: string;
}

// In-memory storage for demo - in production, store in database
let platformSettings: PlatformSettings = {
  platformName: 'Amonita',
  platformEmail: 'contact@amonita.com',
  minInvestment: 1000,
  maxInvestment: 1000000,
  platformFee: 5,
  enableEmailNotifications: true,
  enablePushNotifications: false,
  notifyOnNewProject: true,
  notifyOnInvestment: true,
  requireTwoFactor: false,
  sessionTimeout: 30,
  passwordMinLength: 8,
  autoBackupEnabled: true,
  backupFrequency: 'daily',
};

@Controller('settings')
export class SettingsController {
  @Get('platform')
  @UseGuards(BetterAuthGuard)
  async getPlatformSettings(@Req() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    return platformSettings;
  }

  @Put('platform')
  @UseGuards(BetterAuthGuard)
  async updatePlatformSettings(
    @Body() settings: Partial<PlatformSettings>,
    @Req() req: any,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    platformSettings = { ...platformSettings, ...settings };
    return {
      message: 'Settings updated successfully',
      settings: platformSettings,
    };
  }

  @Put('platform/backup')
  @UseGuards(BetterAuthGuard)
  async triggerBackup(@Req() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    // In production, trigger actual database backup
    return {
      message: 'Backup triggered successfully',
      timestamp: new Date(),
    };
  }
}
