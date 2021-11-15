import { HttpException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import * as _ from 'lodash';
import { Connection } from 'mongoose';
import { DeserializeAccessToken } from 'src/auth/dto/auth.dto';
import { RunningResponse } from '../dto/running.dto';
import { SingleRunningRequest } from '../dto/single-running.dto';
import { RunDataRepository } from '../repositories/run-data.repository';
import { RunningRepository } from '../repositories/running.repository';
import { Runnings } from '../schemas/runnings.schema';
@Injectable()
export class SingleRunningService {
  constructor(
    private readonly runningRepository: RunningRepository,
    private readonly runDataRepository: RunDataRepository,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private sliceRunData(runData: any): any {
    const returnArray = [];
    let count = 0,
      index = 0;

    let fullRunDataLength = 0;
    runData.map((section) => (fullRunDataLength += section.length));
    while (count < 50 && count != fullRunDataLength) {
      const length = runData[index].length;
      console.log(`${index}: ${length}`);
      returnArray.push(
        count + length >= 50
          ? runData[index].slice(0, 50 - count)
          : runData[index],
      );
      count += length;
      index++;
    }
    return returnArray;
  }

  async runStart(
    user: DeserializeAccessToken,
    body: SingleRunningRequest,
  ): Promise<RunningResponse> {
    try {
      const sliceSingleRun = _.cloneDeep(body);

      if (sliceSingleRun.runData[0].constructor == Array)
        sliceSingleRun.runData = this.sliceRunData(sliceSingleRun.runData);
      else sliceSingleRun.runData = sliceSingleRun.runData.slice(0, 49);

      const transactionSession = await this.connection.startSession();
      transactionSession.startTransaction();

      let createSingleRun: Runnings;
      try {
        createSingleRun = await this.runningRepository.create(
          sliceSingleRun,
          user,
          transactionSession,
        );
        await this.runDataRepository.create(body.runData, createSingleRun.id);

        await transactionSession.commitTransaction();
      } catch (err) {
        console.error(err);
        await transactionSession.abortTransaction();
        throw new HttpException(err, 500);
      }

      transactionSession.endSession();

      return createSingleRun.responseData;
    } catch (err) {
      throw new HttpException(err, 500);
    }
  }
}