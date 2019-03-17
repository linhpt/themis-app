import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { TaskService } from 'src/app/core/services/task.service';
import { ContestantService } from 'src/app/core/services/contestant.service';
import { IExam, IContestant, ITask, ISubmission } from 'src/app/core/interfaces/core';
import * as _ from 'lodash';
import { SubmissionWatcher } from 'src/app/core/services/submission-watcher.service';
import { LogsWatcher } from 'src/app/core/services/logs-watcher.service';
import { FolderCreator } from 'src/app/core/services/folder-creator.service';
import { SpreadsheetUtils } from 'src/app/core/services/spreadsheet.service';
import { Location } from '@angular/common';
import { ExamService } from 'src/app/core/services/exam.service';
import { SubmissionService } from 'src/app/core/services/submission.service';

export interface IResult {
  contestantId: number;
  taskName: string;
  content: string;
}

@Component({
  selector: 'app-start-exam',
  templateUrl: './start-exam.component.html',
  styleUrls: ['./start-exam.component.css']
})
export class StartExamComponent implements OnInit, OnDestroy, AfterViewInit {

  exam: IExam = {};
  tasks: ITask[] = [];
  taskIds: Array<number>;
  taskNames: Array<string>;
  contestants: IContestant[] = [];
  contestantIds: Array<number>;
  headers = ['Sdudent ID', 'First Name', 'Last Name', 'Join Date'];
  scoreBoard: Array<Array<string>>;

  constructor(
    private route: ActivatedRoute,
    private taskService: TaskService,
    private contestantService: ContestantService,
    private logsWatcher: LogsWatcher,
    private folderCreator: FolderCreator,
    private cd: ChangeDetectorRef,
    private location: Location,
    private examService: ExamService,
    private submissionService: SubmissionService,
    private spreadsheetUtils: SpreadsheetUtils,
    private submissionWatcher: SubmissionWatcher
  ) { }

  ngOnInit() {
    this.submissionWatcher.watch();
    this.logsWatcher.watch();
    this.route.params.subscribe((params: Params) => {
      const examId = +params['id'];
      this.examService.getById(examId).then((exams: IExam[]) => {
        this.exam = exams[0];
      });
      this.taskService.getByExamId(examId).then((tasks: IExam[]) => {
        this.contestantService.getByExamId(examId).then((contestants: IContestant[]) => {
          if (tasks && tasks.length
            && contestants
            && contestants.length) {
            this.tasks.push(...tasks);
            this.contestants.push(...contestants);

            this.taskIds = tasks.map((task: ITask) => task.taskId);
            this.taskNames = tasks.map((task: ITask) => task.name);
            this.contestantIds = contestants.map((contestant: IContestant) => +contestant.contestantId);

            this.folderCreator.createTasks(this.taskNames);
            this.folderCreator.createContestants(this.contestantIds);

            this.headers.push(...this.taskNames);
            this.spreadsheetUtils.headers = this.headers;

            this.scoreBoard = Array.from({ length: this.contestantIds.length }, (col, colIndex) => {
              return Array.from({ length: this.taskNames.length }, (row, rowIndex) => '-');
            });
            this.updateLastStarted().then(() => {
              this.spreadsheetUtils.rows = this.contestants;
              this.spreadsheetUtils.scoreBoard = this.scoreBoard;
              this.spreadsheetUtils.updateSheet();
            });
          }
        });
      });
    });
  }

  ngAfterViewInit(): void {
    this.logsWatcher.successEvent.subscribe((res: IResult) => {
      let taskIndex = this.taskNames.indexOf(res.taskName);
      let taskId = this.tasks[taskIndex].taskId;
      let contestantIndex = this.contestantIds.indexOf(res.contestantId);
      this.scoreBoard[contestantIndex][taskIndex] = res.content.substr(0, 10);
      let submissionTime = new Date();
      let submission: ISubmission = {
        contestantId: res.contestantId,
        examId: this.exam.examId,
        taskId: taskId,
        timeSubmission: submissionTime.toString(),
        score: res.content
      };
      this.submissionService.add(submission);
      this.cd.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.submissionWatcher.unwatch();
    this.logsWatcher.unwatch();
  }

  async updateLastStarted() {
    for (var i = 0; i < this.contestantIds.length; i++) {
      for (var j = 0; j < this.taskIds.length; j++) {
        let submission = await this.submissionService.getByCondition(this.exam.examId, this.taskIds[j], this.contestantIds[i]);
        if (submission && submission.length) {
          this.scoreBoard[i][j] = submission[0].score.substr(0, 14);
        }
      }
    }
  }

  back() {
    this.location.back();
  }
}
