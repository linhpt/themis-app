import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { ClassService } from 'src/app/core/services/class.service';
import { IClass } from 'src/app/core/interfaces/core';
import * as _ from 'lodash';
import { UtilsService } from 'src/app/core/services/utils.service';
import * as XLSX from 'xlsx';
const fs = (<any>window).require("fs");

@Component({
  selector: 'app-room-details',
  templateUrl: './room-details.component.html',
  styleUrls: ['./room-details.component.css']
})
export class RoomDetailsComponent implements OnInit {

  arrayBuffer: any;
  file: File;

  constructor(
    private route: ActivatedRoute,
    private classService: ClassService,
    private utilsService: UtilsService
  ) { }

  ngOnInit() {
    this.utilsService.toggle(true);
    this.route.params.subscribe((params: Params) => {
      const id = params['id'];
      this.classService.getAll().then((classList: IClass[]) => {
        const viewClass = _.find(classList, (cls: IClass) => cls.id == id);
      });
    });
  }

  incomingfile(event) {
    this.file = event.target.files[0];
  }

  Upload() {
    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      this.arrayBuffer = fileReader.result;
      var data = new Uint8Array(this.arrayBuffer);
      var arr = [];

      for (var i = 0; i != data.length; ++i) {
        arr[i] = String.fromCharCode(data[i]);
      }

      var bstr = arr.join("");
      var workbook = XLSX.read(bstr, { type: "binary" });
      var first_sheet_name = workbook.SheetNames[0];
      var worksheet = workbook.Sheets[first_sheet_name];
      var datajson = XLSX.utils.sheet_to_json(worksheet, { raw: true });
      //console.log(datajson);
      var dsmssv = _.map(datajson, data => data.__EMPTY);
      console.log('filesystem', fs);
      _.forEach(dsmssv, mssv => {
        if (typeof mssv == 'number'){
          let dir = `C:\\Users\\linhp\\Documents\\personal\\test\\${mssv}`;
          if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
          }
        }
      });

    }
    fileReader.readAsArrayBuffer(this.file);
  }

}