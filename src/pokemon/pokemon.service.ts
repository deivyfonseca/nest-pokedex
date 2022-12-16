import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from 'mongoose';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { Pokemon } from './entities/pokemon.entity';

@Injectable()
export class PokemonService {

  constructor(
    @InjectModel( Pokemon.name )
    private readonly pokemonModel: Model<Pokemon>
  ){}

  async create(createPokemonDto: CreatePokemonDto) {
    createPokemonDto.name = createPokemonDto.name.toLowerCase();

    try {
      const pokemon = await this.pokemonModel.create( createPokemonDto );
      return pokemon;
    } catch (error) {
      this.handleException( error );
    }

  }

  findAll(paginationDto: PaginationDto) {
    const { limit = 10 , offset = 0 } = paginationDto;
    return this.pokemonModel.find()
    .limit(limit)
    .skip(offset)
    .sort({no:1})
    .select('-__v');
  }

  async findOne(termino: string) {
    let pokemon: Pokemon;

    // Verifico si el termino es un número (no)
    if ( !isNaN(+termino) ){
      pokemon = await this.pokemonModel.findOne({ no: termino });
    }

    // Si es mongoId
    if ( !pokemon && isValidObjectId( termino ) ){
      pokemon = await this.pokemonModel.findById( termino );
    }

    // Si es un nombre (name)
    if ( !pokemon ) {
      pokemon = await this.pokemonModel.findOne({ name: termino.toLowerCase().trim() });
    }

    if( !pokemon ){
      throw new NotFoundException(`Pokemon with id, name or no "${ termino }" not found`)
    }

    return pokemon;
  }

  async update( termino: string, updatePokemonDto: UpdatePokemonDto ) {
    
    const pokemon = await this.findOne( termino );
    if ( updatePokemonDto.name ){
      updatePokemonDto.name = updatePokemonDto.name.toLowerCase();  
    }
    
    try {
      await pokemon.updateOne( updatePokemonDto );
      return { ...pokemon.toJSON(), ...updatePokemonDto };
    } catch (error) {
      this.handleException( error );
    }

  }

  async remove(id: string) {
    // const pokemon = await this.findOne( id );
    // await pokemon.deleteOne();
    // return { id };

    // await this.pokemonModel.findByIdAndDelete(id);

    const { deletedCount } = await this.pokemonModel.deleteOne({ _id: id });
    if ( deletedCount === 0 ){
      throw new BadRequestException(`Pokemon with id "${ id }" not found`);
    }
    
    return;

  }

  private handleException ( error: any ){
    if (error.code === 11000){
      throw new BadRequestException(`Pokemon exists in db ${ JSON.stringify( error.keyValue ) }`);
    }
    console.log(error);
    throw new InternalServerErrorException(`Can't update pokemon - check server logs`);
  }

}
