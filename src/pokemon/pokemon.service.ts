import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { Model, isValidObjectId } from 'mongoose';
import { Pokemon } from './entities/pokemon.entity';
import { InjectModel } from '@nestjs/mongoose';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PokemonService {

  private defaultLimit: number;

  constructor(
    @InjectModel( Pokemon.name )
    private readonly pokemonModel: Model<Pokemon>,
    private readonly configService: ConfigService,
  ){
    // console.log( process.env.DEFAULT_LIMIT );
    // console.log( configService.get<number>('default_limit') );
    this.defaultLimit = configService.get<number>('default_limit');
  }

  /**
  * Create a pokemon
  * @param createPokemonDto 
  * @returns 
  */
  async create(createPokemonDto: CreatePokemonDto) {
    createPokemonDto.name = createPokemonDto.name.toLowerCase();

    try {
      const pokemon = await this.pokemonModel.create( createPokemonDto );
      return pokemon;
    } catch (error) {
      this.handleException(error);
    }

  }

  findAll(paginationDto: PaginationDto ) {

    const { limit = this.defaultLimit, offset = 0 } = paginationDto;

    return this.pokemonModel.find()
      .limit( limit )
      .skip( offset )
      .sort({ no:1 })
      .select('-__v');
  }

  /**
  * Find a pokemon by term
  * @param termino 
  * @returns 
  */  
  async findOne(termino: string) {
    let pokemon:Pokemon;
    if( !isNaN(+termino) ){
      pokemon = await this.pokemonModel.findOne({ no: termino });
    }

    // MongoID
    if( !pokemon && isValidObjectId(termino) ){
      pokemon = await this.pokemonModel.findById( termino );
    }

    // Name
    if( !pokemon ){
      pokemon = await this.pokemonModel.findOne({ name: termino.toLowerCase().trim() });
    }

    if( !pokemon ) throw new NotFoundException(`Pokemon with id, name or no ${termino} not found `)

    return pokemon;
  }

  /**
   * Update pokemon
   * @param termino 
   * @param updatePokemonDto 
   * @returns 
   */
  async update(termino: string, updatePokemonDto: UpdatePokemonDto) {

    const pokemon = await this.findOne( termino );
    if( updatePokemonDto.name ){
      updatePokemonDto.name = updatePokemonDto.name.toLowerCase();
    }    

    try {
      await pokemon.updateOne( updatePokemonDto );
      return { ...pokemon.toJSON(), ...updatePokemonDto };
    } catch (error) {
      this.handleException(error);
    }

  }

  private handleException(error: any) {
    if (error.code === 11000) {
      throw new BadRequestException(`Pokemon exists in db ${JSON.stringify(error.keyValue)}`);
    }
    console.log( error );
    throw new InternalServerErrorException(`Can't create Pokemon - Check server logs.`)     
  }


  async remove(id: string) {
    // const pokemon = await this.findOne(id);
    // await pokemon.deleteOne();
    // return { id }
    // const result = await this.pokemonModel.findByIdAndDelete(id);
    const { deletedCount } = await this.pokemonModel.deleteOne({ _id: id })
    if(deletedCount === 0){
      throw new BadRequestException(`Pokemon with id "${id}" not found.`)
    }
  }
}
