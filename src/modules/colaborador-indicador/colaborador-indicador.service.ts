import { Injectable } from '@nestjs/common';
import { CriarColaboradorIndicadorDto } from './dto/criar-colaborador-indicador.dto';
import { ColaboradorIndicador, Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { UpdateColaboradorIndicadorDto } from './dto/update-colaborador-indicador.dto';

@Injectable()
export class ColaboradorIndicadorService {
  constructor(private prisma: PrismaService) {}

  existe (mes_ano: string,idIndicador: string, idColaborador: string){
        
    return this.prisma.colaboradorIndicador.findFirst({
      where: {
        mes_ano: mes_ano,
        idIndicador: idIndicador,
        idColaborador: idColaborador
      }
    })
  }

  mes_anoAtual () :string{
    const dataAtual = new Date();
    const anoAtual = dataAtual.getFullYear();
    const mesAtual = dataAtual.getMonth()+1;
    if (mesAtual < 10) {
      return (anoAtual+'-0'+mesAtual+'-01T00:00:00.000Z');
    }else{
      return (anoAtual+'-'+mesAtual+'-01T00:00:00.000Z');
    } 
  }

  listaMes_anoAteDeadLine (deadLine: string): string[] {
    //tenho que colocar todos os mes_ano  ate a dead line em um array 
    const mes_anoDeadLine = (deadLine.substring(0, 8))+'01T00:00:00.000Z';
    var mes_ano = this.mes_anoAtual();
    var chegouDead = false;
    const meses_anos: string[] = []
    
    while (!chegouDead){
      if (mes_ano === mes_anoDeadLine) {
        chegouDead=true;
      }
      
      meses_anos.push(mes_ano)
      //prox mes e ano
      var ano = parseInt(mes_ano.substring(0, 5));
      var mes = parseInt(mes_ano.substring(5, 8));
      if (mes==12) {
        ano++;
        mes=0;
      }
      mes++;
      if (mes < 10) {
        mes_ano = ano+'-0'+mes+'-01T00:00:00.000Z';
      }else{
        mes_ano = ano+'-'+mes+'-01T00:00:00.000Z';
      }

      if (ano===2025) {
        chegouDead=true;
      }
    }

    return meses_anos;


  }
  
  async create(
    data: CriarColaboradorIndicadorDto,
  ): Promise<ColaboradorIndicador> {
    
    const colabIndExiste = await this.existe(data.mes_ano, data.idIndicador, data.idColaborador);
    
    if (colabIndExiste) {
      throw new Error('Não é possível criar o mesmo Colaborador-indicador.')
    }
    
    const colaboradorIndicador = this.prisma.colaboradorIndicador.create({
      data,
    });

    return colaboradorIndicador;
  }

  async createMany(
    data: CriarColaboradorIndicadorDto,
    dataDeadLine: string 
  ) {

    const listaMes_anoAteDeadLine: string[] = this.listaMes_anoAteDeadLine(dataDeadLine);

    var dataAux:CriarColaboradorIndicadorDto=data;
    

    listaMes_anoAteDeadLine.forEach(valor => {
      dataAux.mes_ano=valor;

      this.create(dataAux);

    });

    

    return listaMes_anoAteDeadLine;
  }

  async update(
    id: string,
    updateData: UpdateColaboradorIndicadorDto,
  ): Promise<ColaboradorIndicador> {
    return this.prisma.colaboradorIndicador.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string): Promise<ColaboradorIndicador> {
    return this.prisma.colaboradorIndicador.delete({
      where: { id },
    });
  }

  async findOne(id: string): Promise<ColaboradorIndicador> {
    return this.prisma.colaboradorIndicador.findUnique({
      where: { id },
    });
  }

  async findAllOfColaborator(
    idColaborador: string,
  ): Promise<ColaboradorIndicador[]> {
    return this.prisma.colaboradorIndicador.findMany({
      where: { idColaborador },
    });
  }

  async findAllOfIndicator(
    idIndicador: string,
  ): Promise<ColaboradorIndicador[]> {
    return this.prisma.colaboradorIndicador.findMany({
      where: { idIndicador },
    });
  }

  async findAllOfIndicatorByMonth(
    idIndicador: string,
    mes: string,
  ): Promise<ColaboradorIndicador[]> {
    return this.prisma.colaboradorIndicador.findMany({
      where: {
        idIndicador: idIndicador,
        mes_ano: mes,
      },
    });
  }

  async findAllOfColaboratorByMonth(
    idColaborador: string,
    mes: string,
  ): Promise<ColaboradorIndicador[]> {
    return this.prisma.colaboradorIndicador.findMany({
      where: {
        idColaborador: idColaborador,
        mes_ano: mes,
      },
    });
  }

  async getPercentualDeMetasPorIndicadorPorMes(
    idIndicador: string,
    mes_ano: string
  ) {


    const colabInds = await this.prisma.colaboradorIndicador.findMany({
      where: { idIndicador: idIndicador, mes_ano: mes_ano},
    });

    const totalColab = colabInds.length;

    var numDesafios = 0;
    var numSMetas = 0;
    var numMetas = 0;
    var numFracasso = 0;

    colabInds.forEach(colabInd => {

      if (colabInd.resultado>=colabInd.desafio) {

        numDesafios++;

      }else if (colabInd.resultado>=colabInd.superMeta) {

        numSMetas++
        
      }else if (colabInd.resultado>=colabInd.meta) {
        
        numMetas++;

      }else {

        numFracasso++;

      }

      
      
    });

    numDesafios= numDesafios/totalColab;
    numSMetas= numSMetas/totalColab;
    numMetas= numMetas/totalColab;
    numFracasso= numFracasso/totalColab;

    return {numDesafios, numSMetas, numMetas, numFracasso};

  }

  


  async getPercentualDeMetasBatidasPorMes(idColaborador: string, mes_ano: string): Promise<number[]>{

    const todosColabIndByMonth = await this.findAllOfColaboratorByMonth(idColaborador, mes_ano);

    const totalIndicadoresNoMes = todosColabIndByMonth.length;

    var ano = parseInt(mes_ano.substring(0, 5));
    var mes = parseInt(mes_ano.substring(5, 8));

    const metaSmetaDesafio:number[]=[
      0, //numMetasBatidas
      0, //numSuperMetasBatidas 
      0, //numDesafiosBatidos
      ano, mes];

    todosColabIndByMonth.forEach(colabInd => {
      if (colabInd.resultado >= colabInd.desafio) {
        metaSmetaDesafio[0]++;
        metaSmetaDesafio[1]++;
        metaSmetaDesafio[2]++;
      } else if (colabInd.resultado >= colabInd.superMeta) {
        metaSmetaDesafio[0]++;
        metaSmetaDesafio[1]++;
      } else if (colabInd.resultado >= colabInd.meta) {
        metaSmetaDesafio[0]++;
      }
    });

    const pescentualMetaSmetaDesafio: number[] = [
      metaSmetaDesafio[0]/totalIndicadoresNoMes,
      metaSmetaDesafio[1]/totalIndicadoresNoMes,
      metaSmetaDesafio[2]/totalIndicadoresNoMes,
      metaSmetaDesafio[3],
      metaSmetaDesafio[4]
    ]

    return pescentualMetaSmetaDesafio;
    
  }


  findLastXMonths (mes_ano: string, x?: number): string[] {
    //exemplo de representacao na requisicao: "2020-03-01T00:00:00.000Z"
        var ano = parseInt(mes_ano.substring(0, 5));
        var mes = parseInt(mes_ano.substring(5, 8));
        if(x === undefined){
          x=6;
        }
        const complementoData = mes_ano.substring(7);
    
        const lastXMonths: string[] = [mes_ano];
    
        for (let index = 0; index < (x-1); index++) {
          if (mes===1) {
            mes=13;
            ano--;
          }
    
          mes--;
          if (mes<10) {
            lastXMonths.push(ano+'-0'+mes+complementoData);
          }else{
            lastXMonths.push(ano+'-'+mes+complementoData);
          }
          
        }
        
        return lastXMonths;
    
      }

  async getPercentualDeMetasBatidasLastXMonths(idColaborador: string, mes_ano: string, x?: number){
    
    if(x === undefined){
      x=6;
    }

    const lastXMonths = this.findLastXMonths(mes_ano, x);

    /*
    const percentualDeMetasBatidasLast6Months:number[][] = []

    last6Months.forEach(async data => {
      const aux = await this.getPercentualDeMetasBatidasPorMes(idColaborador, data);
      console.log(aux)
      percentualDeMetasBatidasLast6Months.push(aux);
      
    });
    */


    const promises = lastXMonths.map(async (data) => {

      const aux = await this.getPercentualDeMetasBatidasPorMes(idColaborador, data);
      
      return aux;
    });

    const percentualDeMetasBatidasLast6Months = await Promise.all(promises);

    return percentualDeMetasBatidasLast6Months;
  }

}
