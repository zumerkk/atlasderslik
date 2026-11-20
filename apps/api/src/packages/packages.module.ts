import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { Package, PackageSchema } from './schemas/package.schema';
import { Grade, GradeSchema } from '../education/schemas/grade.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Package.name, schema: PackageSchema },
            { name: Grade.name, schema: GradeSchema },
            { name: User.name, schema: UserSchema },
        ])
    ],
    controllers: [PackagesController],
    providers: [PackagesService],
    exports: [PackagesService]
})
export class PackagesModule { }
